import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { VttModule } from '../../shared/vtt/vtt.module';
import { GamificationModule } from '../gamification/gamification.module';
import { UploadModule } from '../upload/upload.module';
import { UserThrottlerModule } from '../../shared/throttler/user-throttler.module';
import { AiSummariesController } from './ai-summaries.controller';
import { AiTextAssistController } from './ai-text-assist.controller';
import { AiSummariesService } from './ai-summaries.service';
import { SummaryProcessor } from './summary.processor';
import { VertexAiService } from './vertex-ai.service';
import { AiThumbnailService } from './ai-thumbnail.service';

@Module({
  imports: [PrismaModule, ConfigModule, FirebaseModule, VttModule, GamificationModule, UploadModule, UserThrottlerModule],
  controllers: [AiSummariesController, AiTextAssistController],
  providers: [AiSummariesService, VertexAiService, AiThumbnailService, SummaryProcessor],
  exports: [AiSummariesService, VertexAiService, AiThumbnailService],
})
export class AiSummariesModule {}
