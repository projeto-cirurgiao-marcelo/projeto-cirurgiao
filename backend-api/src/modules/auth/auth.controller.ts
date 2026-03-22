import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { FirebaseLoginDto } from './dto/firebase-login.dto';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { GetUser } from './decorators/get-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Rota de registro - cria usuário no Firebase + PostgreSQL
   * Protegida: apenas ADMINs autenticados podem criar novos usuários
   */
  @Post('aulas/92339018203')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar novo usuário (apenas ADMIN)' })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  async secureRegister(@Body() registerDto: RegisterDto) {
    return this.authService.secureRegister(registerDto);
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fazer login' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('auth/firebase-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login com Firebase' })
  @ApiResponse({ status: 200, description: 'Login Firebase realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Token Firebase inválido' })
  async firebaseLogin(@Body() firebaseLoginDto: FirebaseLoginDto) {
    return this.authService.firebaseLogin(firebaseLoginDto);
  }

  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens' })
  @ApiResponse({ status: 200, description: 'Tokens renovados com sucesso' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Post('auth/forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar recuperação de senha' })
  @ApiResponse({ status: 200, description: 'Solicitação recebida com sucesso' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('auth/logout')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fazer logout' })
  @ApiResponse({ status: 200, description: 'Logout realizado com sucesso' })
  async logout(@GetUser('userId') userId: string) {
    return this.authService.logout(userId);
  }

  @Get('auth/me')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter perfil do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil retornado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getProfile(@GetUser('userId') userId: string) {
    return this.authService.getProfile(userId);
  }
}
