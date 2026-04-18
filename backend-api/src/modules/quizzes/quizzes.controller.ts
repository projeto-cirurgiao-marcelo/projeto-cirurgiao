import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { QuizAttemptsService } from './quiz-attempts.service';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { UserThrottlerGuard } from '../../shared/throttler/user-throttler.guard';

@Controller()
@UseGuards(FirebaseAuthGuard)
export class QuizzesController {
  constructor(
    private quizzesService: QuizzesService,
    private quizAttemptsService: QuizAttemptsService,
  ) {}

  // ============================================
  // ENDPOINTS DE QUIZZES
  // ============================================

  /**
   * Gera um novo quiz para um vídeo
   * POST /api/v1/videos/:videoId/quizzes/generate
   */
  @Post('videos/:videoId/quizzes/generate')
  @UseGuards(UserThrottlerGuard)
  async generateQuiz(
    @Param('videoId') videoId: string,
    @Body() dto: GenerateQuizDto,
  ) {
    return this.quizzesService.generateQuiz(videoId, dto);
  }

  /**
   * Lista todos os quizzes de um vídeo
   * GET /api/v1/videos/:videoId/quizzes
   */
  @Get('videos/:videoId/quizzes')
  async listQuizzesByVideo(@Param('videoId') videoId: string) {
    return this.quizzesService.listQuizzesByVideo(videoId);
  }

  /**
   * Obtém um quiz específico (sem respostas corretas)
   * GET /api/v1/quizzes/:quizId
   */
  @Get('quizzes/:quizId')
  async getQuiz(@Param('quizId') quizId: string) {
    return this.quizzesService.getQuiz(quizId);
  }

  /**
   * Deleta um quiz
   * DELETE /api/v1/quizzes/:quizId
   */
  @Delete('quizzes/:quizId')
  @HttpCode(HttpStatus.OK)
  async deleteQuiz(@Param('quizId') quizId: string) {
    return this.quizzesService.deleteQuiz(quizId);
  }

  // ============================================
  // ENDPOINTS DE TENTATIVAS
  // ============================================

  /**
   * Submete as respostas do quiz
   * POST /api/v1/quizzes/:quizId/submit
   */
  @Post('quizzes/:quizId/submit')
  async submitQuiz(
    @Param('quizId') quizId: string,
    @Request() req: any,
    @Body() dto: SubmitQuizDto,
  ) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      throw new Error('Usuario nao autenticado');
    }
    return this.quizAttemptsService.submitQuiz(quizId, userId, dto);
  }

  /**
   * Lista todas as tentativas do usuário para um quiz
   * GET /api/v1/quizzes/:quizId/attempts
   */
  @Get('quizzes/:quizId/attempts')
  async listAttempts(@Param('quizId') quizId: string, @Request() req: any) {
    const userId = req.user.id || req.user.userId;
    return this.quizAttemptsService.listAttempts(quizId, userId);
  }

  /**
   * Obtém uma tentativa específica
   * GET /api/v1/attempts/:attemptId
   */
  @Get('attempts/:attemptId')
  async getAttempt(@Param('attemptId') attemptId: string, @Request() req: any) {
    const userId = req.user.id || req.user.userId;
    return this.quizAttemptsService.getAttempt(attemptId, userId);
  }

  /**
   * Obtém estatísticas do usuário para um quiz
   * GET /api/v1/quizzes/:quizId/stats
   */
  @Get('quizzes/:quizId/stats')
  async getQuizStats(@Param('quizId') quizId: string, @Request() req: any) {
    const userId = req.user.id || req.user.userId;
    return this.quizAttemptsService.getQuizStats(quizId, userId);
  }

  /**
   * Obtém estatísticas agregadas do usuário para todos os quizzes de um vídeo
   * GET /api/v1/videos/:videoId/quiz-stats
   */
  @Get('videos/:videoId/quiz-stats')
  async getVideoQuizStats(@Param('videoId') videoId: string, @Request() req: any) {
    const userId = req.user.id || req.user.userId;
    return this.quizAttemptsService.getVideoQuizStats(videoId, userId);
  }

  /**
   * Obtém estatísticas gerais do usuário (todos os quizzes)
   * GET /api/v1/users/me/quiz-stats
   */
  @Get('users/me/quiz-stats')
  async getUserStats(@Request() req: any) {
    const userId = req.user.id || req.user.userId;
    return this.quizAttemptsService.getUserStats(userId);
  }
}