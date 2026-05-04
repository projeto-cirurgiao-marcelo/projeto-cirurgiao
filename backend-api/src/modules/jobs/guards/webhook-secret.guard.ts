import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Validates the X-Webhook-Secret header against env VIDEO_WEBHOOK_SECRET.
 * Used by the Cloud Run pipeline → backend notify endpoint.
 *
 * Constant-time compare to prevent timing oracles.
 */
@Injectable()
export class WebhookSecretGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSecretGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('VIDEO_WEBHOOK_SECRET');
    if (!expected) {
      this.logger.error('VIDEO_WEBHOOK_SECRET not configured');
      throw new UnauthorizedException('webhook not configured');
    }
    const req = context.switchToHttp().getRequest<Request>();
    const provided = (req.headers['x-webhook-secret'] as string | undefined) ?? '';

    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException('invalid webhook secret');
    }
    return true;
  }
}
