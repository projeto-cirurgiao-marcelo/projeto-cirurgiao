import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { FirebaseAdminService } from '../firebase-admin.service';
import { resolveFirebaseUser } from '../resolve-firebase-user';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Formato de token inválido');
    }

    try {
      // Verifica o token Firebase
      const decodedToken = await this.firebaseAdmin.verifyIdToken(token);

      if (!decodedToken) {
        throw new UnauthorizedException('Token Firebase inválido');
      }

      // Busca o usuário no banco de dados local por firebaseUid, com fallback
      // por e-mail verificado. Acesso por convite: token Firebase válido sem
      // User no Postgres NÃO auto-cria conta (mesma regra do firebaseLogin).
      const user = await resolveFirebaseUser(this.prisma, decodedToken, this.logger);

      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Usuário desativado');
      }

      // Adiciona informações ao request
      request.user = {
        userId: user.id, // Mudado de 'id' para 'userId' para consistência
        id: user.id, // Mantém 'id' para compatibilidade
        email: user.email,
        name: user.name,
        role: user.role,
        firebaseUid: decodedToken.uid,
        emailVerified: decodedToken.email_verified,
      };

      return true;
    } catch (error) {
      this.logger.error('Firebase auth error', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
