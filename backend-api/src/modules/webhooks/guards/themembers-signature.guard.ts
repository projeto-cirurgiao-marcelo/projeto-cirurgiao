import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Valida o header `X-Signature` = HMAC-SHA256 do CORPO CRU com
 * THEMEMBERS_WEBHOOK_SECRET (o security_token configurado no webhook do
 * checkout TheMembers). Comparação timing-safe. Inválido → 403.
 *
 * Requer que a rota receba o corpo cru (Buffer) — ver o middleware
 * express.raw registrado para o path do webhook em main.ts. Assinar sobre o
 * JSON re-serializado nunca bate (bytes diferentes) — por isso o corpo cru.
 */
@Injectable()
export class ThemembersSignatureGuard implements CanActivate {
  private readonly logger = new Logger(ThemembersSignatureGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('THEMEMBERS_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('THEMEMBERS_WEBHOOK_SECRET não configurado');
      throw new ForbiddenException('webhook not configured');
    }

    const req = context.switchToHttp().getRequest<Request & { body?: Buffer }>();
    const raw = req.body;
    if (!Buffer.isBuffer(raw)) {
      this.logger.error('Corpo cru ausente (middleware express.raw não aplicado a esta rota?)');
      throw new ForbiddenException('raw body missing');
    }

    const provided = (req.headers['x-signature'] as string | undefined) ?? '';
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');

    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      this.logger.warn('Assinatura de webhook inválida');
      throw new ForbiddenException('invalid signature');
    }
    return true;
  }
}
