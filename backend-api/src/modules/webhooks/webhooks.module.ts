import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

/**
 * Webhook de compra do checkout TheMembers → concede/revoga Entitlement.
 * FirebaseModule é @Global (fornece FirebaseAdminService para criar usuário
 * novo no ato da compra).
 */
@Module({
  imports: [PrismaModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
