import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiLibraryController } from './ai-library.controller';
import { AiLibraryService } from './ai-library.service';
import { PdfIngestProcessor } from './pdf-ingest.processor';
import { KnowledgeSearchService } from './services/knowledge-search.service';
import { KnowledgeIngestionService } from './services/knowledge-ingestion.service';
import { LibraryChatService } from './services/library-chat.service';
import { TokenQuotaService } from './services/token-quota.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { UserThrottlerModule } from '../../shared/throttler/user-throttler.module';

@Module({
  imports: [PrismaModule, ConfigModule, FirebaseModule, UserThrottlerModule],
  controllers: [AiLibraryController],
  providers: [
    AiLibraryService,
    KnowledgeSearchService,
    KnowledgeIngestionService,
    LibraryChatService,
    TokenQuotaService,
    PdfIngestProcessor,
  ],
  exports: [AiLibraryService],
})
export class AiLibraryModule {}
