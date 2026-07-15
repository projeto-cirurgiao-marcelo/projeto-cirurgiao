import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
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

// Convite do teste fechado: token próprio de 7 dias, uso único via claim
// `pv` amarrado ao campo password do User no Postgres.
describe('AuthService.redeemInvite', () => {
  const SECRET = 'test-secret';
  let service: AuthService;
  let prisma: DeepMockProxy<PrismaService>;
  let firebaseAdmin: DeepMockProxy<FirebaseAdminService>;
  let jwtService: JwtService;

  const binding = (id: string, password: string) =>
    createHash('sha256').update(`${id}:${password}`).digest('hex').slice(0, 16);

  const signInvite = (claims: Record<string, unknown>, expiresIn = '7d') =>
    jwtService.signAsync(claims, { secret: SECRET, expiresIn });

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    firebaseAdmin = mockDeep<FirebaseAdminService>();
    jwtService = new JwtService({});
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: () => SECRET } },
        { provide: FirebaseAdminService, useValue: firebaseAdmin },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  const activeUser = { id: 'u1', email: 'aluno@example.com', password: '', isActive: true } as any;

  it('resgata convite válido: seta senha no Firebase e queima o token', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser);
    firebaseAdmin.getUserByEmail.mockResolvedValue({ uid: 'fb-1' } as any);
    const token = await signInvite({ sub: 'u1', purpose: 'invite', pv: binding('u1', '') });

    const result = await service.redeemInvite(token, 'SenhaForte1');

    expect(result.email).toBe('aluno@example.com');
    expect(firebaseAdmin.updateUserPassword).toHaveBeenCalledWith('fb-1', 'SenhaForte1');
    const update = prisma.user.update.mock.calls[0][0] as any;
    expect(update.data.password).toMatch(/^invite-redeemed:/);
  });

  it('rejeita token já utilizado (binding não bate após o primeiro resgate)', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...activeUser,
      password: 'invite-redeemed:123',
    });
    const token = await signInvite({ sub: 'u1', purpose: 'invite', pv: binding('u1', '') });

    await expect(service.redeemInvite(token, 'SenhaForte1')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(firebaseAdmin.updateUserPassword).not.toHaveBeenCalled();
  });

  it('rejeita token expirado', async () => {
    const token = await signInvite(
      { sub: 'u1', purpose: 'invite', pv: binding('u1', '') },
      '-1s',
    );

    await expect(service.redeemInvite(token, 'SenhaForte1')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita JWT de outra finalidade (ex.: access token)', async () => {
    const token = await signInvite({ sub: 'u1', email: 'aluno@example.com', role: 'STUDENT' });

    await expect(service.redeemInvite(token, 'SenhaForte1')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
