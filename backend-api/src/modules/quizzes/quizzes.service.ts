import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { QuizGeneratorService } from './quiz-generator.service';
import { CaptionsService } from '../captions/captions.service';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { QuizDifficulty } from '@prisma/client';

@Injectable()
export class QuizzesService {
  private readonly logger = new Logger(QuizzesService.name);

  constructor(
    private prisma: PrismaService,
    private quizGenerator: QuizGeneratorService,
    private captionsService: CaptionsService,
  ) {}

  /**
   * Gera um novo quiz para um vídeo
   */
  async generateQuiz(videoId: string, dto: GenerateQuizDto) {
    this.logger.log(`Generating quiz for video ${videoId}`);

    // 1. Verificar se o vídeo existe
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      include: {
        transcript: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    // 2. Buscar conteúdo de texto (transcrição ou legendas)
    let textContent: string | null = null;

    // Prioridade 1: Transcrição manual
    if (video.transcript?.fullText) {
      textContent = video.transcript.fullText;
      this.logger.log(`Using transcript for quiz generation`);
    }
    // Prioridade 2: Legendas da Cloudflare
    else if (video.cloudflareId) {
      try {
        const captions = await this.captionsService.listCaptions(videoId);
        const preferredLanguages = ['pt', 'en', 'es', 'fr', 'de', 'it'];
        let captionToUse = null;

        for (const lang of preferredLanguages) {
          captionToUse = captions.find(
            (c) => c.language === lang && c.status === 'ready',
          );
          if (captionToUse) {
            this.logger.log(`Found caption in language: ${lang}`);
            break;
          }
        }

        if (captionToUse) {
          const vttContent = await this.captionsService.getCaptionVtt(
            videoId,
            captionToUse.language,
          );
          textContent = this.parseVttToText(vttContent);
          this.logger.log(`Using caption for quiz generation`);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to fetch captions for video ${videoId}:`,
          error.message,
        );
      }
    }

    // Se não encontrou nenhuma fonte de texto
    if (!textContent) {
      throw new BadRequestException(
        'Este vídeo ainda não possui transcrição ou legendas. Gere a legenda primeiro ou adicione uma transcrição manual.',
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

  /**
   * Converte conteúdo VTT (legendas) para texto puro
   */
  private parseVttToText(vttContent: string): string {
    let text = vttContent.replace(/^WEBVTT\s*\n/i, '');
    text = text.replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/g, '');
    text = text.replace(/^\d+\s*$/gm, '');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();

    this.logger.log(`Parsed VTT to text: ${text.length} characters`);

    return text;
  }
}