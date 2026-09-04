import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { ShowcasesModule } from '../showcases/showcases.module';

/**
 * Webhook de compra do checkout TheMembers → concede/revoga Entitlement.
 * FirebaseModule é @Global (fornece FirebaseAdminService para criar usuário
 * novo no ato da compra). ShowcasesModule fornece o AccessService que
 * realinha as matrículas (Enrollment) após conceder/revogar.
 */
@Module({
  imports: [PrismaModule, ShowcasesModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
