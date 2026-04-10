import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { VttTextService } from '../../shared/vtt/vtt-text.service';
import { VertexEmbeddingsService, SearchResult } from './services/vertex-embeddings.service';
import { VertexChatService, ChatContext, ChatResponse } from './services/vertex-chat.service';
import { TranscriptChunkingService } from './services/transcript-chunking.service';
import { SendMessageDto, CreateConversationDto } from './dto/send-message.dto';

export interface ConversationWithMessages {
  id: string;
  userId: string;
  videoId: string | null;
  courseId: string | null;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages: {
    id: string;
    role: string;
    content: string;
    sources: any;
    feedback: string | null;
    createdAt: Date;
  }[];
}

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingsService: VertexEmbeddingsService,
    private readonly chatService: VertexChatService,
    private readonly chunkingService: TranscriptChunkingService,
    private readonly gamificationService: GamificationService,
    private readonly vttTextService: VttTextService,
  ) {}

  /**
   * Cria uma nova conversa
   */
  async createConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationWithMessages> {
    this.logger.log(`Creating conversation for user ${userId}`);

    const conversation = await this.prisma.chatConversation.create({
      data: {
        userId,
        videoId: dto.videoId || null,
        courseId: dto.courseId || null,
        title: dto.title || 'Nova conversa',
      },
      include: {
        messages: true,
      },
    });

    return conversation;
  }

  /**
   * Lista conversas do usuário
   */
  async listConversations(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ) {
    const { limit = 20, offset = 0 } = options;

    const conversations = await this.prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const total = await this.prisma.chatConversation.count({
      where: { userId },
    });

    return {
      conversations,
      total,
      limit,
      offset,
    };
  }

  /**
   * Obtém uma conversa com todas as mensagens
   */
  async getConversation(
    conversationId: string,
    userId: string,
  ): Promise<ConversationWithMessages> {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    return conversation;
  }

  /**
   * Deleta uma conversa
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    await this.prisma.chatConversation.delete({
      where: { id: conversationId },
    });

    this.logger.log(`Conversation ${conversationId} deleted`);
  }

  /**
   * Envia uma mensagem e obtém resposta do chatbot
   */
  async sendMessage(
    conversationId: string,
    userId: string,
    dto: SendMessageDto,
  ): Promise<{
    userMessage: any;
    assistantMessage: any;
    suggestions: string[];
  }> {
    this.logger.log(`Processing message in conversation ${conversationId}`);

    // Verificar se a conversa existe e pertence ao usuário
    const conversation = await this.prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 10, // Últimas 10 mensagens para contexto
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    // Salvar mensagem do usuário
    const userMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: dto.message,
      },
    });

    // Determinar contexto de busca
    const videoId = dto.videoId || conversation.videoId;
    const courseId = dto.courseId || conversation.courseId;

    // Buscar chunks relevantes (ou transcrição direta se não houver chunks)
    let relevantChunks = await this.embeddingsService.searchSimilarChunks(
      dto.message,
      {
        videoId: videoId || undefined,
        courseId: courseId || undefined,
        limit: 5,
        minSimilarity: 0.3,
      },
    );

    // Se não houver chunks indexados, buscar transcrição diretamente
    let chunksWithInfo: any[] = [];
    if (relevantChunks.length === 0 && videoId) {
      this.logger.log(`No indexed chunks found, fetching transcript directly for video ${videoId}`);
      const transcriptChunks = await this.getTranscriptDirectly(videoId);
      chunksWithInfo = transcriptChunks;
    } else {
      // Buscar informações adicionais dos vídeos
      chunksWithInfo = await this.enrichChunksWithVideoInfo(relevantChunks);
    }

    // Preparar contexto para o chat
    const context: ChatContext = {
      videoTitle: await this.getVideoTitle(videoId),
      courseTitle: await this.getCourseTitle(courseId),
      relevantChunks: chunksWithInfo,
    };

    // Preparar histórico da conversa
    const conversationHistory = conversation.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Gerar resposta
    const response = await this.chatService.generateResponse(
      dto.message,
      context,
      conversationHistory,
    );

    // Preparar sources com IDs reais
    const sources = relevantChunks.map((chunk) => ({
      videoId: chunk.videoId,
      videoTitle: chunksWithInfo.find(c => c.videoId === chunk.videoId)?.videoTitle,
      timestamp: chunk.startTime,
      text: chunk.chunkText.substring(0, 200),
    }));

    // Salvar resposta do assistente
    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: response.content,
        sources: sources,
        tokenCount: response.tokenCount,
      },
    });

    // Atualizar título da conversa se for a primeira mensagem
    if (conversation.messages.length === 0) {
      await this.updateConversationTitle(conversationId, dto.message);
    }

    // Atualizar timestamp da conversa
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Gerar sugestões de próximas perguntas
    const suggestions = await this.chatService.generateSuggestions(context);

    // Gamificação
    try {
      await this.gamificationService.processAction(userId, 'ai_chat', 5, 'Enviou mensagem no chat IA', userMessage.id);
    } catch (err) { /* gamification should not break chat */ }

    return {
      userMessage,
      assistantMessage,
      suggestions,
    };
  }

  /**
   * Adiciona feedback a uma mensagem
   */
  async addFeedback(
    messageId: string,
    userId: string,
    feedback: 'helpful' | 'not_helpful',
  ): Promise<void> {
    // Verificar se a mensagem pertence a uma conversa do usuário
    const message = await this.prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        conversation: {
          userId,
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Mensagem não encontrada');
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { feedback },
    });

    this.logger.log(`Feedback "${feedback}" added to message ${messageId}`);
  }

  /**
   * Indexa transcrição de um vídeo para busca
   */
  async indexVideoTranscript(videoId: string): Promise<{ chunks: number }> {
    this.logger.log(`Indexing transcript for video ${videoId}`);

    // Processar transcrição em chunks
    const chunks = await this.chunkingService.processTranscript(videoId);

    if (chunks.length === 0) {
      throw new BadRequestException('Vídeo não possui transcrição');
    }

    // Indexar chunks
    await this.embeddingsService.indexAllChunks();

    return { chunks: chunks.length };
  }

  /**
   * Indexa todas as transcrições
   */
  async indexAllTranscripts(): Promise<{ processed: number; total: number }> {
    this.logger.log('Indexing all transcripts');

    // Processar todas as transcrições
    const result = await this.chunkingService.processAllTranscripts();

    // Indexar chunks
    await this.embeddingsService.indexAllChunks();

    return result;
  }

  /**
   * Obtém sugestões de perguntas para um vídeo
   */
  async getSuggestions(videoId?: string, courseId?: string): Promise<string[]> {
    // Buscar alguns chunks para contexto
    const chunks = await this.embeddingsService.searchSimilarChunks(
      'principais conceitos da aula',
      {
        videoId,
        courseId,
        limit: 3,
      },
    );

    const context: ChatContext = {
      videoTitle: await this.getVideoTitle(videoId),
      courseTitle: await this.getCourseTitle(courseId),
      relevantChunks: chunks.map((c) => ({
        text: c.chunkText,
        startTime: c.startTime,
        endTime: c.endTime,
      })),
    };

    return this.chatService.generateSuggestions(context);
  }

  // ============================================
  // Métodos auxiliares privados
  // ============================================

  private async enrichChunksWithVideoInfo(chunks: SearchResult[]) {
    const videoIds = [...new Set(chunks.map((c) => c.videoId))];
    
    const videos = await this.prisma.video.findMany({
      where: { id: { in: videoIds } },
      select: { id: true, title: true },
    });

    const videoMap = new Map(videos.map((v) => [v.id, v.title]));

    return chunks.map((chunk) => ({
      ...chunk,
      text: chunk.chunkText,
      videoTitle: videoMap.get(chunk.videoId),
    }));
  }

  private async getVideoTitle(videoId?: string | null): Promise<string | undefined> {
    if (!videoId) return undefined;

    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { title: true },
    });

    return video?.title;
  }

  private async getCourseTitle(courseId?: string | null): Promise<string | undefined> {
    if (!courseId) return undefined;

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true },
    });

    return course?.title;
  }

  private async updateConversationTitle(
    conversationId: string,
    firstMessage: string,
  ): Promise<void> {
    // Gerar título baseado na primeira mensagem
    const title = firstMessage.length > 50
      ? firstMessage.substring(0, 47) + '...'
      : firstMessage;

    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { title },
    });
  }

  /**
   * Busca legendas VTT do R2 e cria chunks para contexto do chat
   */
  private async getTranscriptDirectly(videoId: string): Promise<any[]> {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, title: true },
    });

    if (!video) {
      this.logger.warn(`Video ${videoId} not found`);
      return [];
    }

    // Buscar segmentos do VTT no R2
    const segments = await this.vttTextService.getSegments(videoId);

    if (segments.length > 0) {
      this.logger.log(`Using VTT segments for video ${videoId} (${segments.length} segments)`);

      // Agrupar segmentos em chunks de ~500 caracteres
      const chunks: any[] = [];
      let currentChunk = {
        text: '',
        startTime: 0,
        endTime: 0,
        videoId: video.id,
        videoTitle: video.title,
      };

      for (const segment of segments) {
        if (currentChunk.text.length === 0) {
          currentChunk.startTime = segment.startTime;
        }

        currentChunk.text += segment.text + ' ';
        currentChunk.endTime = segment.endTime;

        if (currentChunk.text.length >= 500) {
          chunks.push({ ...currentChunk, text: currentChunk.text.trim() });
          currentChunk = {
            text: '',
            startTime: segment.endTime,
            endTime: segment.endTime,
            videoId: video.id,
            videoTitle: video.title,
          };
        }
      }

      if (currentChunk.text.trim().length > 0) {
        chunks.push({ ...currentChunk, text: currentChunk.text.trim() });
      }

      this.logger.log(`Created ${chunks.length} chunks from VTT segments`);
      return chunks;
    }

    // Fallback: texto puro do VTT (sem timestamps)
    const plainText = await this.vttTextService.getPlainText(videoId);
    if (plainText) {
      this.logger.log(`Using plain VTT text for video ${videoId}`);
      const chunks: any[] = [];
      const words = plainText.split(/\s+/);
      const chunkSize = 100;

      for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push({
          text: words.slice(i, i + chunkSize).join(' '),
          startTime: 0,
          endTime: 0,
          videoId: video.id,
          videoTitle: video.title,
        });
      }

      this.logger.log(`Created ${chunks.length} chunks from plain VTT text`);
      return chunks;
    }

    this.logger.warn(`No VTT subtitles found for video ${videoId}`);
    return [];
  }
}
