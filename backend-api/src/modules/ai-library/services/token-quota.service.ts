import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class TokenQuotaService {
  private readonly logger = new Logger(TokenQuotaService.name);
  private readonly DAILY_TOKEN_LIMIT = 50000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna a data atual no formato YYYY-MM-DD
   */
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Consulta a cota restante do usuário para hoje
   */
  async getQuota(userId: string): Promise<{
    tokensUsed: number;
    tokensRemaining: number;
    dailyLimit: number;
    date: string;
  }> {
    const date = this.getTodayDate();

    const usage = await this.prisma.tokenUsageDaily.findUnique({
      where: { userId_date: { userId, date } },
    });

    const tokensUsed = usage?.tokensUsed || 0;

    return {
      tokensUsed,
      tokensRemaining: Math.max(0, this.DAILY_TOKEN_LIMIT - tokensUsed),
      dailyLimit: this.DAILY_TOKEN_LIMIT,
      date,
    };
  }

  /**
   * Verifica se o usuário tem cota disponível
   */
  async hasQuota(userId: string): Promise<boolean> {
    const quota = await this.getQuota(userId);
    return quota.tokensRemaining > 0;
  }

  /**
   * Debita tokens da cota diária do usuário
   */
  async debitTokens(userId: string, tokens: number): Promise<void> {
    const date = this.getTodayDate();

    await this.prisma.tokenUsageDaily.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        tokensUsed: tokens,
      },
      update: {
        tokensUsed: { increment: tokens },
      },
    });

    this.logger.log(`Debited ${tokens} tokens for user ${userId} on ${date}`);
  }
}
