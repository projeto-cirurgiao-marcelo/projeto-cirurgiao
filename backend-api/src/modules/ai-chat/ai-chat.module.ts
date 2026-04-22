import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TranscriptChunkingService } from './services/transcript-chunking.service';
import { VertexEmbeddingsService } from './services/vertex-embeddings.service';
import { VertexChatService } from './services/vertex-chat.service';
import { AiChatService } from './ai-chat.service';
import { AiChatController } from './ai-chat.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { GamificationModule } from '../gamification/gamification.module';
import { VttModule } from '../../shared/vtt/vtt.module';
import { UserThrottlerModule } from '../../shared/throttler/user-throttler.module';

@Module({
  imports: [PrismaModule, ConfigModule, FirebaseModule, GamificationModule, VttModule, UserThrottlerModule],
  controllers: [AiChatController],
  providers: [
    TranscriptChunkingService,
    VertexEmbeddingsService,
    VertexChatService,
    AiChatService,
  ],
  exports: [AiChatService, TranscriptChunkingService],
})
export class AiChatModule {}
