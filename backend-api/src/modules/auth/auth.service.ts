import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { FirebaseLoginDto } from './dto/firebase-login.dto';
import { Role } from '@prisma/client';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private firebaseAdmin: FirebaseAdminService,
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

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

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
  async firebaseLogin(firebaseLoginDto: FirebaseLoginDto) {
    this.logger.log('Tentativa de login via Firebase');

    // Verifica o token Firebase
    const decodedToken = await this.firebaseAdmin.verifyIdToken(firebaseLoginDto.firebaseToken);
    
    if (!decodedToken) {
      throw new UnauthorizedException('Token Firebase inválido');
    }

    this.logger.log(`Token Firebase válido para: ${decodedToken.email}`);

    // Busca o usuário no PostgreSQL
    let user = await this.prisma.user.findUnique({
      where: { email: decodedToken.email },
    });

    // Auto-cria usuário se existe no Firebase mas não no PostgreSQL
    // (mesmo comportamento do FirebaseAuthGuard)
    if (!user && decodedToken.email) {
      this.logger.log(`Auto-criando usuário a partir do Firebase: ${decodedToken.email}`);
      user = await this.prisma.user.create({
        data: {
          email: decodedToken.email,
          name: decodedToken.name || decodedToken.email.split('@')[0],
          password: '',
          role: Role.STUDENT,
          isActive: true,
        },
      });
    }

    if (!user) {
      this.logger.warn(`Login negado: não foi possível autenticar - ${decodedToken.email}`);
      throw new UnauthorizedException('Não foi possível autenticar o usuário.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuário inativo');
    }

    this.logger.log(`Login Firebase bem sucedido para: ${user.email}`);

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
