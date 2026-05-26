import { Test, TestingModule } from '@nestjs/testing';
import { QuizOrphanCleanupService } from './quiz-orphan-cleanup.service';
import { PrismaService } from '../prisma/prisma.service';

describe('QuizOrphanCleanupService', () => {
  let service: QuizOrphanCleanupService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      quiz: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      quizAttempt: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizOrphanCleanupService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<QuizOrphanCleanupService>(QuizOrphanCleanupService);
    prisma = module.get(PrismaService);
  });

  it('não deleta nada quando não há candidatos', async () => {
    (prisma.quiz.findMany as jest.Mock).mockResolvedValue([]);

    await service.cleanupOrphanQuizzes();

    expect(prisma.quiz.deleteMany).not.toHaveBeenCalled();
  });

  it('deleta quizzes órfãos sem tentativas', async () => {
    (prisma.quiz.findMany as jest.Mock).mockResolvedValue([
      { id: 'quiz-1' },
      { id: 'quiz-2' },
    ]);
    (prisma.quizAttempt.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.quiz.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

    await service.cleanupOrphanQuizzes();

    expect(prisma.quiz.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['quiz-1', 'quiz-2'] } },
    });
  });

  it('NUNCA deleta quiz que ganhou tentativa após candidato ser eleito', async () => {
    // quiz-1 sem tentativas (candidato), quiz-2 ganhou tentativa no meio
    (prisma.quiz.findMany as jest.Mock).mockResolvedValue([
      { id: 'quiz-1' },
      { id: 'quiz-2' },
    ]);
    // quiz-2 aparece com tentativa na dupla verificação
    (prisma.quizAttempt.findMany as jest.Mock).mockResolvedValue([
      { quizId: 'quiz-2' },
    ]);
    (prisma.quiz.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    await service.cleanupOrphanQuizzes();

    // Apenas quiz-1 deve ser deletado
    expect(prisma.quiz.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['quiz-1'] } },
    });
  });

  it('não deleta nada se TODOS os candidatos têm tentativas na dupla verificação', async () => {
    (prisma.quiz.findMany as jest.Mock).mockResolvedValue([{ id: 'quiz-1' }]);
    (prisma.quizAttempt.findMany as jest.Mock).mockResolvedValue([
      { quizId: 'quiz-1' },
    ]);

    await service.cleanupOrphanQuizzes();

    expect(prisma.quiz.deleteMany).not.toHaveBeenCalled();
  });

  it('não propaga erro — loga e retorna silenciosamente', async () => {
    (prisma.quiz.findMany as jest.Mock).mockRejectedValue(
      new Error('DB connection lost'),
    );

    // Não deve lançar exceção
    await expect(service.cleanupOrphanQuizzes()).resolves.toBeUndefined();
  });
});
