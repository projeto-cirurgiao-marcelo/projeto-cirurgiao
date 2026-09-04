import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { AccessService } from '../showcases/access.service';
import {
  EVENT_RELEASE,
  EVENT_REVOKE,
  ThemembersData,
  ThemembersWebhook,
} from './themembers-payload';

/** Erro de mapeamento: produto sem vitrine. Registrado com `error`, responde 200. */
class MappingError extends Error {}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseAdminService,
    private readonly access: AccessService,
  ) {}

  /**
   * Entrada única do webhook TheMembers. SEMPRE responde 200 (exceto assinatura
   * inválida, barrada no guard): o TheMembers só reenvia 3× e depois desiste —
   * devolver erro num caso que só o admin resolve faz a compra evaporar. Falha
   * de negócio vira `WebhookEvent.error` para reprocessamento.
   */
  async handle(raw: Buffer): Promise<{ ok: boolean; deduped?: boolean; ignored?: boolean; error?: string }> {
    let body: ThemembersWebhook;
    try {
      body = JSON.parse(raw.toString('utf8'));
    } catch {
      this.logger.warn('Payload de webhook não é JSON válido');
      return { ok: true, error: 'invalid json' };
    }

    const p = body.payload ?? {};
    const event = p.event ?? 'unknown';
    // Idempotência por (event:id). Só `id` colidiria release vs revoke do mesmo
    // pedido (payload.id == order.id no payload de acesso).
    const externalId = `${event}:${p.id ?? crypto.randomUUID()}`;

    // Registra o evento primeiro (auditoria + idempotência). Reenvio colide no unique.
    try {
      await this.prisma.webhookEvent.create({
        data: { externalId, provider: 'themembers', event, payload: body as unknown as Prisma.InputJsonValue },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        this.logger.log(`Webhook duplicado ignorado: ${externalId}`);
        return { ok: true, deduped: true };
      }
      throw e;
    }

    try {
      if (event === EVENT_RELEASE) {
        await this.grantAccess(p.data ?? {});
      } else if (event === EVENT_REVOKE) {
        await this.revokeAccess(p.data ?? {}, event);
      } else {
        // Evento não consumido: fica registrado, marca processado.
        await this.markProcessed(externalId);
        return { ok: true, ignored: true };
      }
      await this.markProcessed(externalId);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha ao processar ${externalId}: ${msg}`);
      await this.prisma.webhookEvent
        .update({ where: { externalId }, data: { error: msg } })
        .catch(() => undefined);
      return { ok: true, error: msg };
    }
  }

  private async markProcessed(externalId: string) {
    await this.prisma.webhookEvent
      .update({ where: { externalId }, data: { processedAt: new Date() } })
      .catch(() => undefined);
  }

  private async grantAccess(data: ThemembersData) {
    const productId = data.product?.id ? String(data.product.id) : null;
    if (!productId) throw new Error('payload sem product.id');

    const showcase = await this.prisma.showcase.findUnique({
      where: { externalProductId: productId },
      select: { id: true, title: true },
    });
    if (!showcase) {
      throw new MappingError(
        `produto ${productId} (${data.product?.name ?? '?'}) sem vitrine vinculada`,
      );
    }

    const email = data.customer?.email?.trim().toLowerCase();
    if (!email) throw new Error('payload sem customer.email');

    const user = await this.findOrCreateUser(email, data.customer?.name);
    const expiresAt = this.parseExpires(data.product?.expires_in);
    const externalOrderId = data.order?.id ? String(data.order.id) : null;

    await this.prisma.entitlement.upsert({
      where: { userId_showcaseId: { userId: user.id, showcaseId: showcase.id } },
      create: {
        userId: user.id,
        showcaseId: showcase.id,
        source: 'PURCHASE',
        externalOrderId,
        expiresAt,
      },
      // Recompra reaproveita a linha e limpa a revogação anterior.
      update: {
        source: 'PURCHASE',
        externalOrderId,
        expiresAt,
        revokedAt: null,
        revokedReason: null,
      },
    });
    this.logger.log(`Acesso liberado: ${email} -> "${showcase.title}"`);
    // Recompra: matrícula suspensa na revogação volta a aparecer.
    await this.access.reconcileEnrollments(user.id);
  }

  private async revokeAccess(data: ThemembersData, event: string) {
    const productId = data.product?.id ? String(data.product.id) : null;
    const email = data.customer?.email?.trim().toLowerCase();
    if (!productId || !email) throw new Error('revoke sem product.id ou customer.email');

    const showcase = await this.prisma.showcase.findUnique({
      where: { externalProductId: productId },
      select: { id: true, title: true },
    });
    if (!showcase) throw new MappingError(`produto ${productId} sem vitrine vinculada`);

    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      this.logger.warn(`revoke para email desconhecido ${email} — nada a revogar`);
      return;
    }

    const ent = await this.prisma.entitlement.findUnique({
      where: { userId_showcaseId: { userId: user.id, showcaseId: showcase.id } },
      select: { id: true, revokedAt: true },
    });
    if (!ent || ent.revokedAt) return; // nada a fazer

    await this.prisma.entitlement.update({
      where: { id: ent.id },
      data: { revokedAt: new Date(), revokedReason: event },
    });
    this.logger.log(`Acesso revogado (${event}): ${email} -> "${showcase.title}"`);
    // Congela as matrículas dos cursos onde o aluno não alcança mais aula nenhuma.
    const sync = await this.access.reconcileEnrollments(user.id);
    if (sync.suspended > 0) {
      this.logger.log(`Matrículas suspensas após revogação: ${sync.suspended} (${email})`);
    }
  }

  /**
   * Acha o User por email; se não existir, cria no Postgres + Firebase e
   * dispara e-mail de definição de senha. Grava firebaseUid na criação
   * (previne takeover de conta por email — ver §9 do design das vitrines).
   */
  private async findOrCreateUser(email: string, name?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return existing;

    const displayName = name?.trim() || email.split('@')[0];

    // Reusa o usuário Firebase se já existir; senão cria com senha aleatória.
    let fb = await this.firebase.getUserByEmail(email);
    if (!fb) {
      const tempPassword = crypto.randomBytes(24).toString('base64url');
      fb = await this.firebase.createUser(email, tempPassword, displayName);
    }
    if (!fb) throw new Error(`falha ao criar/obter usuário Firebase para ${email}`);

    const user = await this.prisma.user.create({
      data: {
        email,
        name: displayName,
        password: '', // sem senha local; autentica via Firebase
        role: Role.STUDENT,
        isActive: true,
        firebaseUid: fb.uid,
      },
      select: { id: true },
    });

    // E-mail de definição de senha — falha aqui não invalida a compra.
    this.firebase
      .sendPasswordResetEmail(email)
      .catch((e) => this.logger.error(`Falha ao enviar e-mail de senha para ${email}: ${e.message}`));

    this.logger.log(`Usuário criado a partir de compra: ${email}`);
    return user;
  }

  /** 'YYYY-MM-DD HH:mm:ss' → Date; ausente/ inválido → null (vitalício). */
  private parseExpires(raw?: string | null): Date | null {
    if (!raw) return null;
    const d = new Date(raw.replace(' ', 'T'));
    return isNaN(d.getTime()) ? null : d;
  }
}
