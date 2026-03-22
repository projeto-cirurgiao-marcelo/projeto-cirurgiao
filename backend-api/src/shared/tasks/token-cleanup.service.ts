import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Serviço que limpa refresh tokens expirados/revogados periodicamente.
 * Executa a cada 6 horas para evitar crescimento infinito da tabela.
 */
@Injectable()
export class TokenCleanupService implements OnModuleInit {
  private readonly logger = new Logger(TokenCleanupService.name);
  private intervalRef: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Executar limpeza na inicialização
    this.cleanup();

    // Agendar a cada 6 horas
    this.intervalRef = setInterval(
      () => this.cleanup(),
      6 * 60 * 60 * 1000,
    );
  }

  async cleanup() {
    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { isRevoked: true },
            { expiresAt: { lt: new Date() } },
          ],
        },
      });

      if (result.count > 0) {
        this.logger.log(`Limpeza: ${result.count} refresh tokens removidos`);
      }
    } catch (error) {
      this.logger.error('Erro na limpeza de tokens', error);
    }
  }

  onModuleDestroy() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }
}
