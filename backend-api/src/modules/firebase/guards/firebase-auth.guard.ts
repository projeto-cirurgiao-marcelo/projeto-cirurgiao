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
import { DevicesService } from '../devices.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly prisma: PrismaService,
    private readonly devices: DevicesService,
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

      // Dispositivo (X-Device-Id). Sem header = cliente antigo, passa.
      // Revogado (limite de dispositivos ou derrubado pelo aluno) = 401 com
      // code DEVICE_REVOKED; o cliente desloga e pede login de novo.
      const deviceInfo = DevicesService.fromHeaders(request.headers);
      if (deviceInfo) {
        const device = await this.devices.touch(user.id, deviceInfo);
        if (device.revokedAt) {
          throw new UnauthorizedException({
            message: 'Esta conta foi usada em outro aparelho. Entre novamente.',
            code: 'DEVICE_REVOKED',
          });
        }
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
        deviceId: deviceInfo?.deviceId ?? null,
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
