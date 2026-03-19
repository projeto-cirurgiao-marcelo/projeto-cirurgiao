import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ForumService } from './forum.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { VoteTopicDto, VoteReplyDto } from './dto/vote.dto';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';

@Controller('forum')
@UseGuards(FirebaseAuthGuard)
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  // ==================== TÓPICOS ====================

  /**
   * Criar novo tópico
   */
  @Post('topics')
  createTopic(@Request() req, @Body() createTopicDto: CreateTopicDto) {
    return this.forumService.createTopic(req.user.userId, createTopicDto);
  }

  /**
   * Listar tópicos (com filtros e paginação)
   */
  @Get('topics')
  findAllTopics(
    @Query('categoryId') categoryId?: string,
    @Query('videoId') videoId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.forumService.findAllTopics({
      categoryId,
      videoId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Buscar tópico por ID (com respostas)
   */
  @Get('topics/:id')
  findOneTopic(@Param('id') id: string) {
    return this.forumService.findOneTopic(id);
  }

  /**
   * Atualizar tópico
   */
  @Patch('topics/:id')
  updateTopic(
    @Param('id') id: string,
    @Body() updateTopicDto: UpdateTopicDto,
    @Request() req,
  ) {
    return this.forumService.updateTopic(
      req.user.userId,
      id,
      updateTopicDto,
      req.user.role,
    );
  }

  /**
   * Deletar tópico
   */
  @Delete('topics/:id')
  removeTopic(@Param('id') id: string, @Request() req) {
    return this.forumService.removeTopic(req.user.userId, id, req.user.role);
  }

  // ==================== RESPOSTAS ====================

  /**
   * Criar resposta
   */
  @Post('replies')
  createReply(@Request() req, @Body() createReplyDto: CreateReplyDto) {
    return this.forumService.createReply(req.user.userId, createReplyDto);
  }

  /**
   * Atualizar resposta
   */
  @Patch('replies/:id')
  updateReply(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Request() req,
  ) {
    return this.forumService.updateReply(
      req.user.userId,
      id,
      body.content,
      req.user.role,
    );
  }

  /**
   * Deletar resposta
   */
  @Delete('replies/:id')
  removeReply(@Param('id') id: string, @Request() req) {
    return this.forumService.removeReply(req.user.userId, id, req.user.role);
  }

  // ==================== VOTOS ====================

  /**
   * Votar em tópico
   */
  @Post('votes/topics')
  voteOnTopic(@Request() req, @Body() voteTopicDto: VoteTopicDto) {
    return this.forumService.voteOnTopic(req.user.userId, voteTopicDto);
  }

  /**
   * Votar em resposta
   */
  @Post('votes/replies')
  voteOnReply(@Request() req, @Body() voteReplyDto: VoteReplyDto) {
    return this.forumService.voteOnReply(req.user.userId, voteReplyDto);
  }

  // ==================== SOLUÇÕES ====================

  /**
   * Marcar resposta como solução
   */
  @Post('topics/:topicId/solution/:replyId')
  markSolution(
    @Request() req,
    @Param('topicId') topicId: string,
    @Param('replyId') replyId: string,
  ) {
    return this.forumService.markReplyAsSolution(req.user.userId, topicId, replyId);
  }

  // ==================== DENÚNCIAS ====================

  /**
   * Denunciar um tópico
   */
  @Post('reports')
  reportTopic(@Request() req, @Body() createReportDto: CreateReportDto) {
    return this.forumService.reportTopic(req.user.userId, createReportDto);
  }

  /**
   * Listar denúncias (ADMIN only)
   */
  @Get('reports')
  findAllReports(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.forumService.findAllReports({
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
