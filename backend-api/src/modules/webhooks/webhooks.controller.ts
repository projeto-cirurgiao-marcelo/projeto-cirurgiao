import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { ThemembersSignatureGuard } from './guards/themembers-signature.guard';
import { ApplePurchasesService } from '../showcases/apple-purchases.service';

/**
 * Webhooks de sistemas externos. Rotas PÚBLICAS (fora do FirebaseAuthGuard),
 * autenticadas por assinatura própria.
 *
 * `POST /api/v1/webhooks/themembers` recebe o corpo CRU (Buffer) — o middleware
 * express.raw está registrado para este path em main.ts, antes do json parser.
 *
 * `POST /api/v1/webhooks/apple` (App Store Server Notifications v2) é JSON
 * normal: a assinatura está dentro do `signedPayload` (JWS), não no corpo.
 */
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly service: WebhooksService,
    private readonly apple: ApplePurchasesService,
  ) {}

  @Post('apple')
  @HttpCode(200)
  async appleNotification(@Body() body: { signedPayload?: string }) {
    if (typeof body?.signedPayload !== 'string') return { ok: true, error: 'missing signedPayload' };
    return this.apple.handleNotification(body.signedPayload);
  }

  @Post('themembers')
  @UseGuards(ThemembersSignatureGuard)
  @HttpCode(200)
  async themembers(@Req() req: Request & { body?: Buffer }) {
    return this.service.handle(req.body as Buffer);
  }
}
