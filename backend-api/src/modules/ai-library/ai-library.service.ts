import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { KnowledgeSearchService } from './services/knowledge-search.service';
import { KnowledgeIngestionService } from './services/knowledge-ingestion.service';
import { LibraryChatService } from './services/library-chat.service';
import { TokenQuotaService } from './services/token-quota.service';
import {
  CreateLibraryConversationDto,
  SendLibraryMessageDto,
  IngestDocumentDto,
} from './dto/library.dto';

@Injectable()
export class AiLibraryService {
  private readonly logger = new Logger(AiLibraryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: KnowledgeSearchService,
    private readonly ingestionService: KnowledgeIngestionService,
    private readonly chatService: LibraryChatService,
    private readonly quotaService: TokenQuotaService,
  ) {}

  // ============================================
  // Conversas
  // ============================================

  async createConversation(userId: string, dto: CreateLibraryConversationDto) {
    const conversation = await this.prisma.libraryConversation.create({
      data: {
        userId,
        title: dto.title || null,
      },
    });

    return conversation;
  }

  async listConversations(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ) {
    const { limit = 20, offset = 0 } = options;

    const [conversations, total] = await Promise.all([
      this.prisma.libraryConversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { content: true, role: true, createdAt: true },
          },
        },
      }),
      this.prisma.libraryConversation.count({ where: { userId } }),
    ]);

    return { conversations, total };
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.libraryConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException('Sem permissão para acessar esta conversa');
    }

    return conversation;
  }

  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.libraryConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException('Sem permissão para deletar esta conversa');
    }

    await this.prisma.libraryConversation.delete({
      where: { id: conversationId },
    });
  }

  // ============================================
  // Mensagens
  // ============================================

  async sendMessage(
    conversationId: string,
    userId: string,
    dto: SendLibraryMessageDto,
  ) {
    // Verificar se a conversa pertence ao usuário
    const conversation = await this.prisma.libraryConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException('Sem permissão');
    }

    // Verificar cota de tokens
    const hasQuota = await this.quotaService.hasQuota(userId);
    if (!hasQuota) {
      throw new BadRequestException(
        'Cota diária de tokens esgotada. Tente novamente amanhã.',
      );
    }

    // Salvar mensagem do usuário
    const userMessage = await this.prisma.libraryMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: dto.message,
      },
    });

    // Buscar chunks relevantes na base de conhecimento
    const relevantChunks = await this.searchService.searchChunks(dto.message, {
      limit: 10,
      minSimilarity: 0.4,
    });

    // Preparar histórico
    const history = conversation.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Gerar resposta
    const response = await this.chatService.generateResponse(
      dto.message,
      relevantChunks,
      history,
    );

    // Salvar resposta do assistente
    const assistantMessage = await this.prisma.libraryMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: response.content,
        sources: response.sources as any,
        tokenCount: response.tokenCount,
      },
    });

    // Debitar tokens
    if (response.tokenCount) {
      await this.quotaService.debitTokens(userId, response.tokenCount);
    }

    // Gerar título automático na primeira mensagem
    if (conversation.messages.length === 0 && !conversation.title) {
      const title = await this.chatService.generateTitle(dto.message);
      await this.prisma.libraryConversation.update({
        where: { id: conversationId },
        data: { title },
      });
    }

    // Atualizar updatedAt da conversa
    await this.prisma.libraryConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      userMessage,
      assistantMessage,
      sources: response.sources,
    };
  }

  async addFeedback(
    messageId: string,
    userId: string,
    feedback: 'helpful' | 'not_helpful',
  ) {
    const message = await this.prisma.libraryMessage.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });

    if (!message) {
      throw new NotFoundException('Mensagem não encontrada');
    }

    if (message.conversation.userId !== userId) {
      throw new ForbiddenException('Sem permissão');
    }

    await this.prisma.libraryMessage.update({
      where: { id: messageId },
      data: { feedback },
    });
  }

  // ============================================
  // Cota
  // ============================================

  async getQuota(userId: string) {
    return this.quotaService.getQuota(userId);
  }

  // ============================================
  // Sugestões
  // ============================================

  async getSuggestions() {
    return this.chatService.generateSuggestions();
  }

  // ============================================
  // Admin: Documentos
  // ============================================

  async ingestDocument(dto: IngestDocumentDto) {
    // Criar registro do documento
    const document = await this.prisma.knowledgeDocument.create({
      data: {
        title: dto.title,
        fileName: dto.gcsPath.split('/').pop() || dto.title,
        gcsPath: dto.gcsPath,
        language: dto.language || 'pt-BR',
        status: 'PENDING',
      },
    });

    // Processar em background (não bloqueia a resposta)
    this.ingestionService
      .processDocument(document.id)
      .catch(err => this.logger.error(`Background processing failed: ${err.message}`));

    return {
      documentId: document.id,
      status: 'PENDING',
      message: 'Documento recebido. O processamento está sendo realizado em background.',
    };
  }

  async listDocuments() {
    return this.prisma.knowledgeDocument.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        fileName: true,
        language: true,
        totalPages: true,
        totalChunks: true,
        status: true,
        errorMessage: true,
        processedAt: true,
        createdAt: true,
      },
    });
  }

  async getDocumentStatus(documentId: string) {
    const document = await this.prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    const indexedChunks = await this.prisma.knowledgeChunk.count({
      where: { documentId, isIndexed: true },
    });

    return {
      ...document,
      indexedChunks,
    };
  }

  async reindexDocument(documentId: string) {
    const document = await this.prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    // Limpar chunks existentes
    await this.prisma.knowledgeChunk.deleteMany({
      where: { documentId },
    });

    // Reprocessar
    this.ingestionService
      .processDocument(documentId)
      .catch(err => this.logger.error(`Reindex failed: ${err.message}`));

    return { message: 'Re-indexação iniciada em background' };
  }

  async deleteDocument(documentId: string) {
    const document = await this.prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    await this.prisma.knowledgeDocument.delete({
      where: { id: documentId },
    });

    return { message: 'Documento e chunks removidos' };
  }
}
