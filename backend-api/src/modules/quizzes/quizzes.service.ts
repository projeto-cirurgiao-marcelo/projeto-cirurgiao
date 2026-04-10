import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { QuizGeneratorService } from './quiz-generator.service';
import { VttTextService } from '../../shared/vtt/vtt-text.service';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { QuizDifficulty } from '@prisma/client';

@Injectable()
export class QuizzesService {
  private readonly logger = new Logger(QuizzesService.name);

  constructor(
    private prisma: PrismaService,
    private quizGenerator: QuizGeneratorService,
    private vttTextService: VttTextService,
  ) {}

  /**
   * Gera um novo quiz para um vídeo
   */
  async generateQuiz(videoId: string, dto: GenerateQuizDto) {
    this.logger.log(`Generating quiz for video ${videoId}`);

    // 1. Verificar se o video existe
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video nao encontrado');
    }

    // 2. Buscar conteudo de texto do VTT no R2
    const textContent = await this.vttTextService.getPlainText(videoId);

    if (!textContent) {
      throw new BadRequestException(
        'Este video nao possui legendas VTT. Verifique se o arquivo subtitles_pt.vtt existe na pasta do video no R2.',
      );
    }

    // 4. Gerar quiz com IA
    const generatedQuiz = await this.quizGenerator.generateQuiz({
      content: textContent,
      videoTitle: video.title,
      difficulty: dto.difficulty || QuizDifficulty.MEDIUM,
      questionCount: dto.questionCount || 5,
    });

    // 5. Salvar no banco de dados
    const quiz = await this.prisma.quiz.create({
      data: {
        videoId,
        title: dto.title || `Quiz: ${video.title}`,
        description: dto.description || `Quiz sobre ${video.title}`,
        difficulty: dto.difficulty || QuizDifficulty.MEDIUM,
        timeLimit: dto.timeLimit,
        passingScore: dto.passingScore || 70,
        questions: {
          create: generatedQuiz.questions.map((q, index) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            order: index + 1,
            points: 10,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    this.logger.log(
      `Quiz created with id ${quiz.id} and ${quiz.questions.length} questions`,
    );

    return quiz;
  }

  /**
   * Lista todos os quizzes de um vídeo
   */
  async listQuizzesByVideo(videoId: string) {
    const quizzes = await this.prisma.quiz.findMany({
      where: { videoId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            question: true,
            options: true,
            order: true,
            points: true,
            // NÃO incluir correctAnswer e explanation aqui
          },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    });

    return quizzes;
  }

  /**
   * Obtém um quiz específico (sem respostas corretas)
   */
  async getQuiz(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        video: {
          select: {
            id: true,
            title: true,
          },
        },
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            question: true,
            options: true,
            order: true,
            points: true,
            // NÃO incluir correctAnswer e explanation
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz não encontrado');
    }

    return quiz;
  }

  /**
   * Obtém um quiz com respostas (apenas para correção)
   */
  async getQuizWithAnswers(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz não encontrado');
    }

    return quiz;
  }

  /**
   * Deleta um quiz
   */
  async deleteQuiz(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz não encontrado');
    }

    await this.prisma.quiz.delete({
      where: { id: quizId },
    });

    this.logger.log(`Quiz ${quizId} deleted`);

    return { message: 'Quiz deletado com sucesso' };
  }

}