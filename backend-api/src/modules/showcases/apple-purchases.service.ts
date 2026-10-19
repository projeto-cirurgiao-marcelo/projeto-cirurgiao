import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import {
  Environment,
  NotificationTypeV2,
  SignedDataVerifier,
} from '@apple/app-store-server-library';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AccessService } from './access.service';
import { APPLE_ROOT_CERTS } from './apple-root-certs';

/** Tipos de notificação que tiram o direito. Tudo o mais só fica registrado. */
/** VerificationException da lib vem sem message; o status é o que explica. */
const describe = (e: unknown) =>
  e instanceof Error ? `${e.message || e.constructor.name} status=${(e as { status?: number }).status ?? '-'}` : String(e);

const REVOKING: ReadonlySet<string> = new Set([
  NotificationTypeV2.REFUND,
  NotificationTypeV2.REVOKE,
]);

/**
 * Compra In-App (iOS) → Entitlement. Mesma filosofia do webhook TheMembers
 * (`webhooks.service.ts`): WebhookEvent registra tudo (auditoria +
 * idempotência), falha de negócio vira `error` em vez de 5xx.
 *
 * A prova de compra é o JWS assinado pela Apple (StoreKit 2). Validamos
 * assinatura, bundleId e ambiente aqui — nunca confiar no app.
 * Env: APPLE_BUNDLE_ID, APPLE_APP_ID (Apple ID numérico do app no ASC),
 * APPLE_IAP_ENV = Production | Sandbox (só define qual ambiente tenta primeiro).
 */
@Injectable()
export class ApplePurchasesService {
  private readonly logger = new Logger(ApplePurchasesService.name);
  private verifiers?: SignedDataVerifier[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Produção primeiro, Sandbox depois. O App Review testa a compra no build
   * de produção usando o ambiente Sandbox, e o TestFlight também — então o
   * servidor de produção tem que aceitar os dois (recomendação da Apple).
   * APPLE_IAP_ENV=Sandbox só inverte a ordem.
   */
  private getVerifiers(): SignedDataVerifier[] {
    if (this.verifiers) return this.verifiers;
    const bundleId = this.config.get<string>('APPLE_BUNDLE_ID');
    const appAppleId = Number(this.config.get<string>('APPLE_APP_ID'));
    if (!bundleId || !appAppleId) {
      throw new Error('APPLE_BUNDLE_ID / APPLE_APP_ID não configurados');
    }
    const envs =
      this.config.get<string>('APPLE_IAP_ENV') === 'Sandbox'
        ? [Environment.SANDBOX, Environment.PRODUCTION]
        : [Environment.PRODUCTION, Environment.SANDBOX];
    // enableOnlineChecks=false: sem OCSP por request (latência); a assinatura
    // e a cadeia até a raiz da Apple continuam verificadas.
    this.verifiers = envs.map(
      (env) => new SignedDataVerifier(APPLE_ROOT_CERTS, false, env, bundleId, appAppleId),
    );
    return this.verifiers;
  }

  /** Tenta cada ambiente; devolve o primeiro que valida. */
  private async decode<T>(fn: (v: SignedDataVerifier) => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (const v of this.getVerifiers()) {
      try {
        return await fn(v);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  }

  private decodeTransaction(jws: string) {
    return this.decode((v) => v.verifyAndDecodeTransaction(jws));
  }

  private decodeNotification(payload: string) {
    return this.decode((v) => v.verifyAndDecodeNotification(payload));
  }

  /**
   * App terminou uma compra: valida o JWS da transação e concede a vitrine
   * do productId ao usuário autenticado. Idempotente por transactionId.
   */
  async verifyAndGrant(userId: string, jws: string): Promise<{ ok: true; showcaseSlug: string; deduped?: boolean }> {
    let tx: Awaited<ReturnType<SignedDataVerifier['verifyAndDecodeTransaction']>>;
    try {
      tx = await this.decodeTransaction(jws);
    } catch (e) {
      this.logger.warn(`JWS de transação inválido (user ${userId}): ${describe(e)}`);
      throw new BadRequestException('Transação inválida');
    }

    const productId = tx.productId;
    const transactionId = tx.transactionId;
    const originalTransactionId = tx.originalTransactionId ?? transactionId;
    if (!productId || !transactionId) throw new BadRequestException('Transação sem productId');

    const showcase = await this.prisma.showcase.findUnique({
      where: { appleProductId: productId },
      select: { id: true, slug: true, title: true },
    });
    if (!showcase) {
      // Produto criado no ASC sem vitrine vinculada: erro de cadastro, não do aluno.
      this.logger.error(`IAP ${productId} (tx ${transactionId}) sem vitrine vinculada`);
      throw new BadRequestException('Produto sem curso vinculado');
    }

    const externalId = `purchase:${transactionId}`;
    try {
      await this.prisma.webhookEvent.create({
        data: {
          externalId,
          provider: 'apple',
          event: 'PURCHASE',
          payload: { userId, ...tx } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        this.logger.log(`Transação Apple duplicada ignorada: ${transactionId}`);
        return { ok: true, showcaseSlug: showcase.slug, deduped: true };
      }
      throw e;
    }

    await this.prisma.entitlement.upsert({
      where: { userId_showcaseId: { userId, showcaseId: showcase.id } },
      create: {
        userId,
        showcaseId: showcase.id,
        source: 'PURCHASE',
        externalOrderId: originalTransactionId,
        expiresAt: null,
      },
      // Recompra após reembolso reaproveita a linha (unique userId+showcaseId).
      update: {
        source: 'PURCHASE',
        externalOrderId: originalTransactionId,
        expiresAt: null,
        revokedAt: null,
        revokedReason: null,
      },
    });
    await this.prisma.webhookEvent
      .update({ where: { externalId }, data: { processedAt: new Date() } })
      .catch(() => undefined);
    await this.access.reconcileEnrollments(userId);

    this.logger.log(`IAP liberado: user ${userId} -> "${showcase.title}" (tx ${transactionId}, ${tx.environment ?? 'env?'})`);
    return { ok: true, showcaseSlug: showcase.slug };
  }

  /**
   * App Store Server Notifications v2. Sempre responde ok (a Apple reenvia
   * por dias; o que não processar fica em WebhookEvent.error).
   */
  async handleNotification(signedPayload: string): Promise<{ ok: true; deduped?: boolean; ignored?: boolean; error?: string }> {
    let note: Awaited<ReturnType<SignedDataVerifier['verifyAndDecodeNotification']>>;
    try {
      note = await this.decodeNotification(signedPayload);
    } catch (e) {
      this.logger.warn(`Notificação Apple inválida: ${describe(e)}`);
      return { ok: true, error: 'invalid signature' };
    }

    const type = note.notificationType ?? 'unknown';
    const externalId = `notification:${note.notificationUUID}`;
    try {
      await this.prisma.webhookEvent.create({
        data: {
          externalId,
          provider: 'apple',
          event: type,
          payload: note as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return { ok: true, deduped: true };
      }
      throw e;
    }

    const markProcessed = () =>
      this.prisma.webhookEvent
        .update({ where: { externalId }, data: { processedAt: new Date() } })
        .catch(() => undefined);

    if (!REVOKING.has(type)) {
      await markProcessed();
      return { ok: true, ignored: true };
    }

    try {
      const signedTx = note.data?.signedTransactionInfo;
      if (!signedTx) throw new Error('notificação sem signedTransactionInfo');
      const tx = await this.decodeTransaction(signedTx);
      const originalTransactionId = tx.originalTransactionId ?? tx.transactionId;
      if (!originalTransactionId) throw new Error('transação sem originalTransactionId');

      const ents = await this.prisma.entitlement.findMany({
        where: { externalOrderId: originalTransactionId, revokedAt: null },
        select: { id: true, userId: true },
      });
      for (const ent of ents) {
        await this.prisma.entitlement.update({
          where: { id: ent.id },
          data: { revokedAt: new Date(), revokedReason: `apple:${type}` },
        });
        const sync = await this.access.reconcileEnrollments(ent.userId);
        this.logger.log(
          `IAP revogado (${type}): user ${ent.userId}, tx ${originalTransactionId}, matrículas suspensas ${sync.suspended}`,
        );
      }
      if (ents.length === 0) {
        this.logger.warn(`${type} para tx ${originalTransactionId} sem entitlement ativo`);
      }
      await markProcessed();
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
}
