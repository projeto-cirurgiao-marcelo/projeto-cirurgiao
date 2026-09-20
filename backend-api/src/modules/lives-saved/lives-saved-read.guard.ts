import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { LivesSavedService } from './lives-saved.service';

export const DISPLAY_TOKEN_HEADER = 'x-display-token';

/**
 * Leitura do contador: usuário Firebase OU credencial de exibição da tela
 * corporativa (header `x-display-token`). A credencial nunca vale para
 * escrita nem para `admin/` — só as rotas que declaram este guard.
 */
@Injectable()
export class LivesSavedReadGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseAuthGuard,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const raw = req.headers?.[DISPLAY_TOKEN_HEADER];
    if (typeof raw !== 'string' || !raw) {
      return (await this.firebase.canActivate(ctx)) as boolean;
    }
    const row = await this.prisma.displayToken.findFirst({
      where: { tokenHash: LivesSavedService.hashDisplayToken(raw), revokedAt: null },
      select: { id: true },
    });
    if (!row) throw new UnauthorizedException('Credencial de exibição inválida ou revogada');
    // Best-effort: "último acesso" para o admin saber que a TV está viva.
    void this.prisma.displayToken
      .update({ where: { id: row.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
    req.user = { userId: `display:${row.id}`, id: `display:${row.id}`, role: 'DISPLAY', displayTokenId: row.id };
    return true;
  }
}
