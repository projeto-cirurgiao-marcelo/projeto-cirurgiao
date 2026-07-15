import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { AuthService } from './auth.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';

// Regressão do acesso por convite: token Firebase válido SEM User no
// Postgres não pode mais auto-criar conta (registro público desativado).
describe('AuthService.firebaseLogin', () => {
  let service: AuthService;
  let prisma: DeepMockProxy<PrismaService>;
  let firebaseAdmin: DeepMockProxy<FirebaseAdminService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    firebaseAdmin = mockDeep<FirebaseAdminService>();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: mockDeep<JwtService>() },
        { provide: ConfigService, useValue: mockDeep<ConfigService>() },
        { provide: FirebaseAdminService, useValue: firebaseAdmin },
      ],
    }).compile();
    service = module.get(AuthService);

    firebaseAdmin.verifyIdToken.mockResolvedValue({
      email: 'intruso@example.com',
      uid: 'fb-uid',
    } as any);
  });

  it('nega login de conta Firebase sem User no Postgres (sem auto-create)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.firebaseLogin({ firebaseToken: 'valid-token' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('nega login de usuário inativo', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'intruso@example.com',
      isActive: false,
    } as any);

    await expect(
      service.firebaseLogin({ firebaseToken: 'valid-token' }),
    ).rejects.toThrow('Usuário inativo');
  });

  it('permite login de conta pré-criada e ativa', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'intruso@example.com',
      name: 'Aluno',
      role: 'STUDENT',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    prisma.userProfile.findUnique.mockResolvedValue(null);

    const result = await service.firebaseLogin({ firebaseToken: 'valid-token' });

    expect(result.user.email).toBe('intruso@example.com');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
