import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LivesSavedController } from './lives-saved.controller';
import { AdminLivesSavedController } from './admin-lives-saved.controller';
import { LivesSavedService } from './lives-saved.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { CloudflareModule } from '../cloudflare/cloudflare.module';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AuditModule } from '../../shared/audit/audit.module';

@Module({
  imports: [ConfigModule, FirebaseModule, CloudflareModule, PrismaModule, AuditModule],
  controllers: [LivesSavedController, AdminLivesSavedController],
  providers: [LivesSavedService],
  exports: [LivesSavedService],
})
export class LivesSavedModule {}
