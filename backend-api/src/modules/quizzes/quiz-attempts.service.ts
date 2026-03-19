import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { QuizzesService } from './quizzes.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { QuizResult } from './interfaces/quiz.interface';

@Injectable()
export class QuizAttemptsService {
  private readonly logger = new Logger(QuizAttemptsService.name);

  constructor(
    private prisma: PrismaService,
    private quizzesService: QuizzesService,
    private gamificationService: GamificationService,
  ) {}

  /**
   * Submete as respostas do quiz e calcula a pontuação
   */
  async submitQuiz(
    quizId: string,
    userId: string,
    dto: SubmitQuizDto,
  ): Promise<QuizResult> {
    this.logger.log(`User ${userId} submitting quiz ${quizId}`);

    // 1. Buscar quiz com respostas corretas
    const quiz = await this.quizzesService.getQuizWithAnswers(quizId);

    // 2. Validar que todas as questões foram respondidas
    if (dto.answers.length !== quiz.questions.length) {
      throw new BadRequestException(
        `Você deve responder todas as ${quiz.questions.length} questões`,
      );
    }

    // 3. Corrigir as respostas
    let correctCount = 0;
    const correctedAnswers = dto.answers.map((userAnswer) => {
      const question = quiz.questions.find((q) => q.id === userAnswer.questionId);

      if (!question) {
        throw new BadRequestException(
          `Questão ${userAnswer.questionId} não encontrada`,
        );
      }

      const isCorrect = userAnswer.answer === question.correctAnswer;
      if (isCorrect) {
        correctCount++;
      }

      return {
        questionId: question.id,
        userAnswer: userAnswer.answer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation || '',
        timeSpent: userAnswer.timeSpent,
      };
    });

    // 4. Calcular pontuação
    const totalQuestions = quiz.questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= quiz.passingScore;

    this.logger.log(
      `Quiz ${quizId} corrected: ${correctCount}/${totalQuestions} correct, score: ${score}%, passed: ${passed}`,
    );

    // 5. Salvar tentativa no banco
    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        score,
        correctCount,
        totalQuestions,
        timeSpent: dto.totalTimeSpent,
        passed,
        answers: {
          create: correctedAnswers.map((answer) => ({
            questionId: answer.questionId,
            answer: answer.userAnswer,
            isCorrect: answer.isCorrect,
            timeSpent: answer.timeSpent,
          })),
        },
      },
      include: {
        answers: true,
      },
    });

    this.logger.log(`Quiz attempt ${attempt.id} saved`);

    // Gamificação: conceder XP por quiz
    // Buscar tentativas anteriores por VÍDEO (não por quiz), pois cada tentativa gera um quiz novo
    try {
      const videoId = quiz.videoId;
      const allVideoQuizIds = (await this.prisma.quiz.findMany({
        where: { videoId },
        select: { id: true },
      })).map(q => q.id);

      const previousAttempts = await this.prisma.quizAttempt.findMany({
        where: {
          quizId: { in: allVideoQuizIds },
          userId,
          id: { not: attempt.id },
        },
        orderBy: { completedAt: 'desc' },
      });

      if (passed) {
        const isFirstAttempt = previousAttempts.length === 0;
        const xp = isFirstAttempt ? 50 : 30;
        await this.gamificationService.processAction(
          userId,
          'quiz_pass',
          xp,
          `Passou no quiz (${score}%)`,
          videoId,
        );
        if (score === 100) {
          await this.gamificationService.processAction(
            userId,
            'quiz_perfect',
            75,
            'Nota máxima no quiz',
            `${videoId}_perfect`,
          );
        }
      }

      // Premiar melhoria de nota (mesmo que não tenha passado)
      if (previousAttempts.length > 0) {
        const previousBest = Math.max(...previousAttempts.map(a => a.score));
        if (score > previousBest) {
          await this.gamificationService.processAction(
            userId,
            'quiz_improvement',
            10,
            `Melhorou nota: ${previousBest}% → ${score}%`,
            `${videoId}_improvement`,
          );
        }
      }
    } catch (err) {
      this.logger.warn('Gamification quiz processAction failed', err);
    }

    // 6. Retornar resultado
    return {
      score,
      correctCount,
      totalQuestions,
      passed,
      answers: correctedAnswers,
    };
  }

  /**
   * Lista todas as tentativas de um usuário para um quiz
   */
  async listAttempts(quizId: string, userId: string) {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: {
        quizId,
        userId,
      },
      orderBy: {
        completedAt: 'desc',
      },
      include: {
        answers: {
          include: {
            question: {
              select: {
                question: true,
                options: true,
              },
            },
          },
        },
      },
    });

    return attempts;
  }

  /**
   * Obtém uma tentativa específica com detalhes
   */
  async getAttempt(attemptId: string, userId: string) {
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: {
        id: attemptId,
        userId,
      },
      include: {
        quiz: {
          include: {
            video: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        answers: {
          include: {
            question: {
              select: {
                question: true,
                options: true,
                correctAnswer: true,
                explanation: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Tentativa não encontrada');
    }

    return attempt;
  }

  /**
   * Obtém estatísticas do usuário para um quiz
   */
  async getQuizStats(quizId: string, userId: string) {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: {
        quizId,
        userId,
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        bestScore: 0,
        averageScore: 0,
        passed: false,
        lastAttemptDate: null,
      };
    }

    const bestScore = Math.max(...attempts.map((a) => a.score));
    const averageScore = Math.round(
      attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length,
    );
    const passed = attempts.some((a) => a.passed);
    const lastAttemptDate = attempts[0].completedAt;

    return {
      totalAttempts: attempts.length,
      bestScore,
      averageScore,
      passed,
      lastAttemptDate,
    };
  }

  /**
   * Obtém estatísticas agregadas do usuário para um vídeo (todos os quizzes do vídeo)
   */
  async getVideoQuizStats(videoId: string, userId: string) {
    // Buscar todos os quizzes deste vídeo
    const quizzes = await this.prisma.quiz.findMany({
      where: { videoId },
      select: { id: true },
    });

    if (quizzes.length === 0) {
      return {
        totalAttempts: 0,
        bestScore: 0,
        averageScore: 0,
        passed: false,
        lastAttemptDate: null,
      };
    }

    const quizIds = quizzes.map(q => q.id);

    // Buscar todas as tentativas do usuário para qualquer quiz deste vídeo
    const attempts = await this.prisma.quizAttempt.findMany({
      where: {
        quizId: { in: quizIds },
        userId,
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        bestScore: 0,
        averageScore: 0,
        passed: false,
        lastAttemptDate: null,
      };
    }

    const bestScore = Math.max(...attempts.map(a => a.score));
    const averageScore = Math.round(
      attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length,
    );
    const passed = attempts.some(a => a.passed);
    const lastAttemptDate = attempts[0].completedAt;

    return {
      totalAttempts: attempts.length,
      bestScore,
      averageScore,
      passed,
      lastAttemptDate,
    };
  }

  /**
   * Obtém estatísticas gerais do usuário (todos os quizzes)
   */
  async getUserStats(userId: string) {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            videoId: true,
          },
        },
      },
    });

    const totalAttempts = attempts.length;
    const uniqueQuizzes = new Set(attempts.map((a) => a.quizId)).size;
    const passedQuizzes = new Set(
      attempts.filter((a) => a.passed).map((a) => a.quizId),
    ).size;
    const averageScore =
      totalAttempts > 0
        ? Math.round(
            attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts,
          )
        : 0;

    return {
      totalAttempts,
      uniqueQuizzes,
      passedQuizzes,
      averageScore,
      recentAttempts: attempts.slice(0, 5),
    };
  }
}