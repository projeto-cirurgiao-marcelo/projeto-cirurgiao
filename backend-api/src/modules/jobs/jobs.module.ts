import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { VideoJobsService } from './video-jobs.service';
import { WebhookSecretGuard } from './guards/webhook-secret.guard';
import { FirebaseModule } from '../firebase/firebase.module';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [FirebaseModule, PrismaModule, ConfigModule],
  controllers: [JobsController],
  providers: [JobsService, VideoJobsService, WebhookSecretGuard],
  exports: [JobsService, VideoJobsService],
})
export class JobsModule {}
