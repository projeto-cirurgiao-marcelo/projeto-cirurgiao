import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { FirebaseLoginDto } from './dto/firebase-login.dto';
import { InviteStudentDto } from './dto/invite-student.dto';
import { Role } from '@prisma/client';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { resolveFirebaseUser } from '../firebase/resolve-firebase-user';
import { DevicesService, DeviceInfo } from '../firebase/devices.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private firebaseAdmin: FirebaseAdminService,
    private devices: DevicesService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        name: registerDto.name,
        role: Role.STUDENT,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    this.logger.log(`Tentativa de login para: ${loginDto.email}`);

    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      this.logger.warn(`Login falhou: Usuário não encontrado - ${loginDto.email}`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.isActive) {
      this.logger.warn(`Login falhou: Usuário inativo - ${loginDto.email}`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(`Login falhou: Senha incorreta - ${loginDto.email}`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    this.logger.log(`Login bem sucedido para: ${loginDto.email}`);
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Usuário inválido');
      }

      await this.prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { isRevoked: true },
      });

      const tokens = await this.generateTokens(user.id, user.email, user.role);
      await this.saveRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  async logout(userId: string, deviceId: string | null = null) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    if (deviceId) await this.devices.revokeByDeviceId(userId, deviceId);

    return { message: 'Logout realizado com sucesso' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return user;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    this.logger.log(`Solicitação de recuperação de senha para: ${forgotPasswordDto.email}`);

    // Envia e-mail de recuperação direto via Firebase Identity Toolkit REST API.
    // Não depende do PostgreSQL — o Firebase valida se o e-mail existe internamente.
    // Se o e-mail não existir no Firebase, retorna EMAIL_NOT_FOUND (capturado silenciosamente).
    try {
      await this.firebaseAdmin.sendPasswordResetEmail(forgotPasswordDto.email);
      this.logger.log(`E-mail de recuperação enviado para ${forgotPasswordDto.email}`);
    } catch (error) {
      // Silencioso: por segurança, não informamos se o e-mail existe ou não
      this.logger.warn(`Recuperação de senha falhou para ${forgotPasswordDto.email}: ${error.message}`);
    }

    return { message: 'Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha.' };
  }

  /**
   * Login com Firebase Authentication
   * Verifica o token Firebase e sincroniza com o banco PostgreSQL
   */
  async firebaseLogin(firebaseLoginDto: FirebaseLoginDto, device: DeviceInfo | null = null) {
    this.logger.log('Tentativa de login via Firebase');

    // Verifica o token Firebase
    const decodedToken = await this.firebaseAdmin.verifyIdToken(firebaseLoginDto.firebaseToken);
    
    if (!decodedToken) {
      throw new UnauthorizedException('Token Firebase inválido');
    }

    this.logger.log(`Token Firebase válido para: ${decodedToken.email}`);

    // Busca o usuário no PostgreSQL por firebaseUid (identidade canônica),
    // com fallback por e-mail verificado enquanto durar o backfill.
    const user = await resolveFirebaseUser(this.prisma, decodedToken, this.logger);

    // Acesso por convite: contas são pré-criadas (secureRegister / script
    // create-test-students). Token Firebase válido sem User no Postgres NÃO
    // cria conta — qualquer um consegue criar conta Firebase com a API key
    // pública do bundle, então auto-create aqui = registro aberto por fora.
    if (!user) {
      this.logger.warn(`Login negado: conta não cadastrada - ${decodedToken.email}`);
      throw new UnauthorizedException(
        'Conta não encontrada. O acesso à plataforma é por convite.',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuário inativo');
    }

    this.logger.log(`Login Firebase bem sucedido para: ${user.email}`);

    // Login (re)ativa o dispositivo e derruba o mais antigo se passou do limite.
    if (device) await this.devices.register(user.id, user.role, device);

    // Busca o perfil para verificar se o onboarding foi completado
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    // Retorna os dados do usuário (sem gerar JWT, usa o token Firebase)
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        onboardingCompleted: profile?.onboardingCompleted ?? false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      firebaseToken: firebaseLoginDto.firebaseToken,
    };
  }

  /**
   * Registro via rota secreta /aulas/92339018203
   * Cria o usuário no Firebase Auth + PostgreSQL
   */
  async secureRegister(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    // Cria o usuário no Firebase Auth via Admin SDK
    const firebaseUser = await this.firebaseAdmin.createUser(
      registerDto.email,
      registerDto.password,
      registerDto.name,
    );

    if (!firebaseUser) {
      throw new ConflictException('Erro ao criar usuário no Firebase');
    }

    // Cria o usuário no PostgreSQL
    // Rota protegida por ADMIN guard — sempre cria como STUDENT
    // Para promover a ADMIN/INSTRUCTOR, usar endpoint de gestão de usuários
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: '', // Firebase gerencia a senha
        name: registerDto.name,
        role: Role.STUDENT,
        firebaseUid: firebaseUser.uid,
      },
    });

    this.logger.log(`Novo usuário registrado via rota secreta: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      message: 'Usuário criado com sucesso',
    };
  }

  /**
   * Convite do teste fechado — resgate de token próprio (7 dias, uso único).
   *
   * O link de reset do Firebase expira em ~1h, inviável pra convite via
   * WhatsApp. O token de convite é um JWT nosso (mesmo JWT_SECRET, purpose
   * 'invite') gerado pelo script create-test-students. Uso único via claim
   * `pv`: amarra o token ao valor atual do campo `password` do User no
   * Postgres (padrão do reset token do Django) — o resgate troca esse campo,
   * então o mesmo token não valida uma segunda vez. Todos os erros viram o
   * mesmo 401 genérico pra não vazar estado da conta.
   */
  private inviteBinding(user: { id: string; password: string }): string {
    return createHash('sha256')
      .update(`${user.id}:${user.password}`)
      .digest('hex')
      .slice(0, 16);
  }

  async redeemInvite(token: string, newPassword: string) {
    const invalid = () =>
      new UnauthorizedException('Convite inválido, expirado ou já utilizado');

    let payload: { sub?: string; purpose?: string; pv?: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch {
      throw invalid();
    }
    if (payload.purpose !== 'invite' || !payload.sub || !payload.pv) {
      throw invalid();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive || this.inviteBinding(user) !== payload.pv) {
      throw invalid();
    }

    const firebaseUser = await this.firebaseAdmin.getUserByEmail(user.email);
    if (!firebaseUser) {
      this.logger.error(`Invite redeem: usuário ${user.id} sem conta Firebase`);
      throw invalid();
    }

    // Ordem importa: primeiro a senha no Firebase (fonte de verdade do
    // login); só então o convite é marcado como usado. Se o updateUser
    // lançar, o token continua válido pra nova tentativa.
    await this.firebaseAdmin.updateUserPassword(firebaseUser.uid, newPassword);
    // Grava o firebaseUid aqui: definir senha pelo Admin SDK não marca
    // email_verified, então sem o UID o aluno cairia no fallback e seria
    // barrado no primeiro login.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: `invite-redeemed:${Date.now()}`, firebaseUid: firebaseUser.uid },
    });

    this.logger.log(`Convite resgatado: ${user.email}`);
    return { email: user.email };
  }

  /**
   * Convite pelo painel admin — mesma mecânica do script
   * create-test-students, só que acionável pelo ADMIN sem acesso ao servidor.
   *
   * Idempotente: cria a conta no Firebase (senha descartável aleatória) e no
   * Postgres só se ainda não existirem; grava o firebaseUid se faltava.
   * Sempre devolve um link de convite novo (JWT próprio, 7 dias, uso único
   * via claim `pv`) pra copiar e mandar por WhatsApp, e opcionalmente dispara
   * o e-mail de criação de senha pelo template do Firebase.
   */
  async inviteStudent(dto: InviteStudentDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name?.trim() || this.nameFromEmail(email);

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.role !== Role.STUDENT) {
      throw new ConflictException('E-mail já pertence a uma conta que não é de aluno');
    }

    const firebaseUid = await this.ensureFirebaseAccount(email, name);
    let created = false;
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          password: '', // Firebase gerencia a senha
          role: Role.STUDENT,
          isActive: true,
          firebaseUid,
        },
      });
      created = true;
      this.logger.log(`Aluno convidado (conta criada): ${email}`);
    } else if (!user.firebaseUid) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { firebaseUid },
      });
    }

    const { inviteUrl, expiresAt } = await this.buildInviteLink(user);
    const emailSent = await this.maybeSendInviteEmail(email, dto.sendEmail);

    return {
      user: { id: user.id, email: user.email, name: user.name, isActive: user.isActive },
      created,
      inviteUrl,
      expiresAt,
      emailSent,
    };
  }

  /** Reenvio pra quem já existe mas não recebeu/perdeu o convite. */
  async resendInvite(userId: string, sendEmail?: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.role !== Role.STUDENT) {
      throw new BadRequestException('Convite só pode ser reenviado para alunos');
    }
    if (!user.isActive) {
      throw new BadRequestException('Usuário inativo — ative a conta antes de reenviar o convite');
    }

    const firebaseUid = await this.ensureFirebaseAccount(user.email, user.name);
    if (!user.firebaseUid) {
      await this.prisma.user.update({ where: { id: user.id }, data: { firebaseUid } });
    }

    const { inviteUrl, expiresAt } = await this.buildInviteLink(user);
    const emailSent = await this.maybeSendInviteEmail(user.email, sendEmail);
    this.logger.log(`Convite reenviado: ${user.email}`);

    return {
      user: { id: user.id, email: user.email, name: user.name, isActive: user.isActive },
      inviteUrl,
      expiresAt,
      emailSent,
    };
  }

  private async ensureFirebaseAccount(email: string, name: string): Promise<string> {
    const existing = await this.firebaseAdmin.getUserByEmail(email);
    if (existing) return existing.uid;
    const created = await this.firebaseAdmin.createUser(
      email,
      // Senha descartável — o aluno define a dele pelo link do convite.
      randomBytes(24).toString('base64url'),
      name,
    );
    if (!created) {
      throw new ConflictException('Erro ao criar conta no Firebase');
    }
    return created.uid;
  }

  private async buildInviteLink(user: { id: string; email: string; password: string }) {
    const expiresInSeconds = 7 * 24 * 60 * 60;
    const token = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, purpose: 'invite', pv: this.inviteBinding(user) },
      { secret: this.configService.get('JWT_SECRET'), expiresIn: expiresInSeconds },
    );
    const base = (
      this.configService.get<string>('FRONTEND_URL') || 'https://www.projetocirurgiao.app'
    ).replace(/\/+$/, '');
    return {
      inviteUrl: `${base}/auth/action?mode=invite&token=${token}`,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  }

  /** Falha no e-mail não invalida o convite: o link já foi gerado e é devolvido. */
  private async maybeSendInviteEmail(email: string, sendEmail?: boolean): Promise<boolean> {
    if (sendEmail === false) return false;
    try {
      await this.firebaseAdmin.sendPasswordResetEmail(email);
      return true;
    } catch (error) {
      this.logger.warn(`Convite: e-mail não enviado para ${email}: ${error.message}`);
      return false;
    }
  }

  /** "dra.lucimarazanolla" -> "Dra Lucimarazanolla" (aluno ajusta no perfil) */
  private nameFromEmail(email: string): string {
    const name = email
      .split('@')[0]
      .split(/[._\-\d]+/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
    return name || email;
  }

  private async generateTokens(userId: string, email: string, role: Role) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRATION'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async saveRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }
}
