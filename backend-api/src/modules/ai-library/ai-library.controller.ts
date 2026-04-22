import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiLibraryService } from './ai-library.service';
import {
  CreateLibraryConversationDto,
  SendLibraryMessageDto,
  MessageFeedbackDto,
  IngestDocumentDto,
} from './dto/library.dto';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserThrottlerGuard } from '../../shared/throttler/user-throttler.guard';
import { QueueService } from '../../shared/queue/queue.service';
import { QUEUE_NAMES } from '../../shared/queue/queue.constants';
import { Role } from '@prisma/client';

@Controller('library')
export class AiLibraryController {
  constructor(
    private readonly aiLibraryService: AiLibraryService,
    private readonly queueService: QueueService,
  ) {}

  // ============================================
  // Endpoints de Conversas (Aluno)
  // ============================================

  @Post('chat/conversations')
  @UseGuards(FirebaseAuthGuard)
  async createConversation(
    @Request() req: any,
    @Body() dto: CreateLibraryConversationDto,
  ) {
    return this.aiLibraryService.createConversation(req.user.id, dto);
  }

  @Get('chat/conversations')
  @UseGuards(FirebaseAuthGuard)
  async listConversations(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.aiLibraryService.listConversations(req.user.id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('chat/conversations/:id')
  @UseGuards(FirebaseAuthGuard)
  async getConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
  ) {
    return this.aiLibraryService.getConversation(conversationId, req.user.id);
  }

  @Delete('chat/conversations/:id')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
  ) {
    await this.aiLibraryService.deleteConversation(conversationId, req.user.id);
  }

  // ============================================
  // Endpoints de Mensagens (Aluno)
  // ============================================

  @Post('chat/conversations/:id/messages')
  @UseGuards(FirebaseAuthGuard, UserThrottlerGuard)
  async sendMessage(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body() dto: SendLibraryMessageDto,
  ) {
    return this.aiLibraryService.sendMessage(conversationId, req.user.id, dto);
  }

  @Post('chat/messages/:id/feedback')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async addFeedback(
    @Request() req: any,
    @Param('id') messageId: string,
    @Body() dto: MessageFeedbackDto,
  ) {
    await this.aiLibraryService.addFeedback(messageId, req.user.id, dto.feedback);
  }

  // ============================================
  // Cota de Tokens
  // ============================================

  @Get('quota')
  @UseGuards(FirebaseAuthGuard)
  async getQuota(@Request() req: any) {
    return this.aiLibraryService.getQuota(req.user.id);
  }

  // ============================================
  // Sugestões
  // ============================================

  @Get('suggestions')
  async getSuggestions() {
    return this.aiLibraryService.getSuggestions();
  }

  // ============================================
  // Admin: Gestão de Documentos
  // ============================================

  @Post('admin/documents/ingest')
  @UseGuards(FirebaseAuthGuard, RolesGuard, UserThrottlerGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  async ingestDocument(
    @Body() dto: IngestDocumentDto,
    @Request() req: any,
  ) {
    // aiLibraryService.ingestDocument creates the KnowledgeDocument row
    // synchronously and kicks off the heavy embedding work in the
    // background (via ingestionService.processDocument). We keep the
    // original create-step inline so the response can return the
    // documentId, then enqueue the heavy work so QueueService can track
    // it. When the queue is off, fallback falls back to the inline path.
    const document = await this.aiLibraryService.ingestDocument(dto);
    const enqueueResult = await this.queueService.enqueue(
      QUEUE_NAMES.PDF_INGEST,
      {
        type: QUEUE_NAMES.PDF_INGEST,
        userId: req.user?.sub ?? req.user?.id ?? 'anonymous',
        entityId: document.documentId,
        documentId: document.documentId,
      },
      {
        fallback: async () => {
          // aiLibraryService.ingestDocument already kicked off the work
          // in-process via `ingestionService.processDocument(...).catch(...)`
          // — so the fallback is a no-op, we just return the doc ref.
          return { resultRef: document.documentId };
        },
      },
    );
    return {
      ...enqueueResult,
      document,
    };
  }

  @Get('admin/documents')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async listDocuments() {
    return this.aiLibraryService.listDocuments();
  }

  @Get('admin/documents/:id/status')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getDocumentStatus(@Param('id') documentId: string) {
    return this.aiLibraryService.getDocumentStatus(documentId);
  }

  @Post('admin/documents/:id/reindex')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async reindexDocument(@Param('id') documentId: string) {
    return this.aiLibraryService.reindexDocument(documentId);
  }

  @Delete('admin/documents/:id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(@Param('id') documentId: string) {
    await this.aiLibraryService.deleteDocument(documentId);
  }
}
