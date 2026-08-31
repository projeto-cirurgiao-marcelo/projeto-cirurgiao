import { Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { ThemembersSignatureGuard } from './guards/themembers-signature.guard';

/**
 * Webhooks de sistemas externos. Rotas PÚBLICAS (fora do FirebaseAuthGuard),
 * autenticadas por assinatura própria.
 *
 * `POST /api/v1/webhooks/themembers` recebe o corpo CRU (Buffer) — o middleware
 * express.raw está registrado para este path em main.ts, antes do json parser.
 */
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post('themembers')
  @UseGuards(ThemembersSignatureGuard)
  @HttpCode(200)
  async themembers(@Req() req: Request & { body?: Buffer }) {
    return this.service.handle(req.body as Buffer);
  }
}
