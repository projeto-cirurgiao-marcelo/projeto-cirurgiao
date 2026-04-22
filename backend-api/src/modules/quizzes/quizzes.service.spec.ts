import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { QuizDifficulty } from '@prisma/client';

import { QuizzesService } from './quizzes.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { QuizGeneratorService } from './quiz-generator.service';
import { VttTextService } from '../../shared/vtt/vtt-text.service';

describe('QuizzesService', () => {
  let service: QuizzesService;
  let prisma: DeepMockProxy<PrismaService>;
  let quizGenerator: DeepMockProxy<QuizGeneratorService>;
  let vtt: DeepMockProxy<VttTextService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    quizGenerator = mockDeep<QuizGeneratorService>();
    vtt = mockDeep<VttTextService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: PrismaService, useValue: prisma },
        { provide: QuizGeneratorService, useValue: quizGenerator },
        { provide: VttTextService, useValue: vtt },
      ],
    }).compile();
    service = module.get(QuizzesService);
  });

  describe('generateQuiz', () => {
    const dto = { questionCount: 3 } as any;

    it('throws NotFound when the video is missing', async () => {
      prisma.video.findUnique.mockResolvedValue(null);

      await expect(service.generateQuiz('missing', dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(quizGenerator.generateQuiz).not.toHaveBeenCalled();
    });

    it('throws BadRequest when the video has no VTT text', async () => {
      prisma.video.findUnique.mockResolvedValue({
        id: 'v1',
        title: 'T',
      } as any);
      vtt.getPlainText.mockResolvedValue(null as any);

      await expect(service.generateQuiz('v1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(quizGenerator.generateQuiz).not.toHaveBeenCalled();
    });

    it('happy path: fills defaults, creates quiz with 3 questions', async () => {
      prisma.video.findUnique.mockResolvedValue({
        id: 'v1',
        title: 'Cirurgia felina',
      } as any);
      vtt.getPlainText.mockResolvedValue('transcript text');
      quizGenerator.generateQuiz.mockResolvedValue({
        questions: [
          { question: 'q1', options: ['a', 'b'], correctAnswer: 0, explanation: 'e1' },
          { question: 'q2', options: ['a', 'b'], correctAnswer: 1, explanation: 'e2' },
          { question: 'q3', options: ['a', 'b'], correctAnswer: 0, explanation: 'e3' },
        ],
      } as any);
      prisma.quiz.create.mockResolvedValue({
        id: 'quiz-1',
        questions: [{}, {}, {}],
      } as any);

      await service.generateQuiz('v1', dto);

      const generatorArgs = quizGenerator.generateQuiz.mock.calls[0][0];
      expect(generatorArgs.difficulty).toBe(QuizDifficulty.MEDIUM);
      expect(generatorArgs.questionCount).toBe(3);
      expect(generatorArgs.videoTitle).toBe('Cirurgia felina');

      const createArgs = prisma.quiz.create.mock.calls[0][0].data as any;
      expect(createArgs.videoId).toBe('v1');
      expect(createArgs.title).toBe('Quiz: Cirurgia felina');
      expect(createArgs.passingScore).toBe(70);
      expect(createArgs.questions.create).toHaveLength(3);
      // Order is 1-based.
      expect(createArgs.questions.create[0].order).toBe(1);
      expect(createArgs.questions.create[2].order).toBe(3);
    });

    it('respects overrides from the DTO', async () => {
      prisma.video.findUnique.mockResolvedValue({ id: 'v1', title: 'T' } as any);
      vtt.getPlainText.mockResolvedValue('…');
      quizGenerator.generateQuiz.mockResolvedValue({ questions: [] } as any);
      prisma.quiz.create.mockResolvedValue({ questions: [] } as any);

      await service.generateQuiz('v1', {
        difficulty: QuizDifficulty.HARD,
        questionCount: 10,
        title: 'Custom',
        description: 'Desc',
        passingScore: 90,
        timeLimit: 300,
      } as any);

      const createArgs = prisma.quiz.create.mock.calls[0][0].data as any;
      expect(createArgs.difficulty).toBe(QuizDifficulty.HARD);
      expect(createArgs.title).toBe('Custom');
      expect(createArgs.description).toBe('Desc');
      expect(createArgs.passingScore).toBe(90);
      expect(createArgs.timeLimit).toBe(300);
    });
  });

  describe('getQuiz / getQuizWithAnswers', () => {
    it('getQuiz throws NotFound when missing', async () => {
      prisma.quiz.findUnique.mockResolvedValue(null);
      await expect(service.getQuiz('missing')).rejects.toThrow(NotFoundException);
    });

    it('getQuiz returns the quiz', async () => {
      prisma.quiz.findUnique.mockResolvedValue({ id: 'quiz-1' } as any);
      const out = await service.getQuiz('quiz-1');
      expect(out).toEqual({ id: 'quiz-1' });
    });

    it('getQuizWithAnswers throws NotFound when missing', async () => {
      prisma.quiz.findUnique.mockResolvedValue(null);
      await expect(service.getQuizWithAnswers('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteQuiz', () => {
    it('deletes an existing quiz', async () => {
      prisma.quiz.findUnique.mockResolvedValue({ id: 'quiz-1' } as any);
      prisma.quiz.delete.mockResolvedValue({} as any);

      const out = await service.deleteQuiz('quiz-1');
      expect(prisma.quiz.delete).toHaveBeenCalledWith({ where: { id: 'quiz-1' } });
      expect(out).toEqual({ message: 'Quiz deletado com sucesso' });
    });

    it('throws NotFound when quiz is missing', async () => {
      prisma.quiz.findUnique.mockResolvedValue(null);
      await expect(service.deleteQuiz('missing')).rejects.toThrow(NotFoundException);
      expect(prisma.quiz.delete).not.toHaveBeenCalled();
    });
  });

  describe('listQuizzesByVideo', () => {
    it('scopes by videoId and omits correct answers from the select', async () => {
      prisma.quiz.findMany.mockResolvedValue([]);

      await service.listQuizzesByVideo('v1');

      const args = prisma.quiz.findMany.mock.calls[0][0]!;
      expect((args.where as any).videoId).toBe('v1');
      const questionsSelect = (args.include as any).questions.select;
      expect(questionsSelect.correctAnswer).toBeUndefined();
      expect(questionsSelect.explanation).toBeUndefined();
      expect(questionsSelect.question).toBe(true);
    });
  });
});
