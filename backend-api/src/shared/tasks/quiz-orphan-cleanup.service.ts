import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Remove quizzes criados há mais de 7 dias sem nenhuma tentativa.
 *
 * Quizzes são gerados dinamicamente pela IA a cada solicitação do aluno.
 * Sem tentativas após 7 dias = aluno não completou e o registro fica órfão.
 * Quizzes com pelo menos uma tentativa NUNCA são apagados.
 *
 * Agenda: todo dia às 03:00 (fora do horário de pico).
 */
@Injectable()
export class QuizOrphanCleanupService {
  private readonly logger = new Logger(QuizOrphanCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOrphanQuizzes(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    try {
      // Buscar IDs de quizzes elegíveis para remoção:
      // - criados há mais de 7 dias
      // - sem nenhum QuizAttempt vinculado
      // O Prisma não suporta deleteMany com relação none diretamente via where,
      // então buscamos os IDs primeiro e depois deletamos em lote.
      const candidates = await this.prisma.quiz.findMany({
        where: {
          createdAt: { lt: cutoff },
          attempts: { none: {} },
        },
        select: { id: true },
      });

      if (candidates.length === 0) {
        this.logger.debug('Nenhum quiz órfão encontrado');
        return;
      }

      const ids = candidates.map((q) => q.id);

      // Dupla verificação: garantir que nenhum dos candidatos ganhou uma
      // tentativa entre a consulta acima e o delete (janela de corrida mínima).
      const withAttempts = await this.prisma.quizAttempt.findMany({
        where: { quizId: { in: ids } },
        select: { quizId: true },
      });

      const safeToDelete = ids.filter(
        (id) => !withAttempts.some((a) => a.quizId === id),
      );

      if (safeToDelete.length === 0) {
        this.logger.debug(
          'Candidatos encontrados, mas todos ganharam tentativas — nada deletado',
        );
        return;
      }

      const result = await this.prisma.quiz.deleteMany({
        where: { id: { in: safeToDelete } },
      });

      this.logger.log(
        `Cleanup: ${result.count} quiz(zes) órfão(s) removido(s) (criados antes de ${cutoff.toISOString()})`,
      );
    } catch (error) {
      this.logger.error('Erro no cleanup de quizzes órfãos', error);
    }
  }
}
