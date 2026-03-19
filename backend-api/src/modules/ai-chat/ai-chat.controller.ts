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
import { AiChatService } from './ai-chat.service';
import { SendMessageDto, CreateConversationDto, MessageFeedbackDto } from './dto/send-message.dto';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  // ============================================
  // Endpoints de Conversas
  // ============================================

  /**
   * Criar nova conversa
   */
  @Post('conversations')
  @UseGuards(FirebaseAuthGuard)
  async createConversation(
    @Request() req: any,
    @Body() dto: CreateConversationDto,
  ) {
    return this.aiChatService.createConversation(req.user.id, dto);
  }

  /**
   * Listar conversas do usuário
   */
  @Get('conversations')
  @UseGuards(FirebaseAuthGuard)
  async listConversations(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.aiChatService.listConversations(req.user.id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Obter conversa com mensagens
   */
  @Get('conversations/:id')
  @UseGuards(FirebaseAuthGuard)
  async getConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
  ) {
    return this.aiChatService.getConversation(conversationId, req.user.id);
  }

  /**
   * Deletar conversa
   */
  @Delete('conversations/:id')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
  ) {
    await this.aiChatService.deleteConversation(conversationId, req.user.id);
  }

  // ============================================
  // Endpoints de Mensagens
  // ============================================

  /**
   * Enviar mensagem e obter resposta
   */
  @Post('conversations/:id/messages')
  @UseGuards(FirebaseAuthGuard)
  async sendMessage(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.aiChatService.sendMessage(conversationId, req.user.id, dto);
  }

  /**
   * Adicionar feedback a uma mensagem
   */
  @Post('messages/:id/feedback')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async addFeedback(
    @Request() req: any,
    @Param('id') messageId: string,
    @Body() dto: MessageFeedbackDto,
  ) {
    await this.aiChatService.addFeedback(messageId, req.user.id, dto.feedback);
  }

  // ============================================
  // Endpoints de Sugestões
  // ============================================

  /**
   * Obter sugestões de perguntas (público - não requer autenticação)
   */
  @Get('suggestions')
  async getSuggestions(
    @Query('videoId') videoId?: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.aiChatService.getSuggestions(videoId, courseId);
  }

  // ============================================
  // Endpoints de Indexação (Admin)
  // ============================================

  /**
   * Indexar transcrição de um vídeo
   */
  @Post('index/video/:videoId')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  async indexVideoTranscript(@Param('videoId') videoId: string) {
    return this.aiChatService.indexVideoTranscript(videoId);
  }

  /**
   * Indexar todas as transcrições
   */
  @Post('index/all')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async indexAllTranscripts() {
    return this.aiChatService.indexAllTranscripts();
  }
}