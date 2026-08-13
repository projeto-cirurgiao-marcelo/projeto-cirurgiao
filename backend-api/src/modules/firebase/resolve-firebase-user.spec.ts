import { Logger } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { resolveFirebaseUser, redactEmail } from './resolve-firebase-user';
import { PrismaService } from '../../shared/prisma/prisma.service';

// O vetor que este arquivo protege: comprar/registrar usando o e-mail de um
// admin não pode entregar o User admin. Identidade é o UID; e-mail só vale
// como fallback verificado enquanto o backfill não terminar.
describe('resolveFirebaseUser', () => {
  let prisma: DeepMockProxy<PrismaService>;
  let logger: Logger;
  let warn: jest.SpyInstance;

  const token = (over: Partial<DecodedIdToken> = {}) =>
    ({
      uid: 'fb-uid-123',
      email: 'aluno@example.com',
      email_verified: true,
      ...over,
    }) as DecodedIdToken;

  /** findUnique responde conforme a chave usada na busca. */
  const db = (rows: { byUid?: any; byEmail?: any }) => {
    (prisma.user.findUnique as unknown as jest.Mock).mockImplementation((args: any) =>
      Promise.resolve(args.where.firebaseUid ? (rows.byUid ?? null) : (rows.byEmail ?? null)),
    );
  };

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    logger = new Logger('test');
    warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
  });

  it('resolve por firebaseUid', async () => {
    const user = { id: 'u1', email: 'aluno@example.com', firebaseUid: 'fb-uid-123' };
    db({ byUid: user });

    await expect(resolveFirebaseUser(prisma, token(), logger)).resolves.toBe(user);
    expect(warn).not.toHaveBeenCalled();
  });

  it('cai no fallback por e-mail verificado, avisa e grava o UID', async () => {
    const user = { id: 'u1', email: 'aluno@example.com', firebaseUid: null };
    db({ byEmail: user });
    prisma.user.update.mockResolvedValue({ ...user, firebaseUid: 'fb-uid-123' } as any);

    const result = await resolveFirebaseUser(prisma, token(), logger);

    expect(result).toMatchObject({ id: 'u1', firebaseUid: 'fb-uid-123' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { firebaseUid: 'fb-uid-123' },
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('fallback'));
    // e-mail redigido no log
    expect(warn.mock.calls[0][0]).not.toContain('aluno@example.com');
  });

  it('nega quando o User do e-mail não tem UID e o e-mail não é verificado', async () => {
    db({ byEmail: { id: 'admin', email: 'admin@example.com', firebaseUid: null } });

    await expect(
      resolveFirebaseUser(prisma, token({ email_verified: false }), logger),
    ).resolves.toBeNull();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('não verificado'));
  });

  it('nega quando o UID não está no banco e o e-mail não tem User', async () => {
    db({});

    await expect(resolveFirebaseUser(prisma, token(), logger)).resolves.toBeNull();
  });

  it('nega quando o User do e-mail já está vinculado a outra conta Firebase', async () => {
    db({ byEmail: { id: 'admin', email: 'admin@example.com', firebaseUid: 'outro-uid' } });

    await expect(resolveFirebaseUser(prisma, token(), logger)).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('outro uid'));
  });

  it('não derruba o login se a gravação do UID falhar', async () => {
    const user = { id: 'u1', email: 'aluno@example.com', firebaseUid: null };
    db({ byEmail: user });
    prisma.user.update.mockRejectedValue(new Error('unique violation'));

    await expect(resolveFirebaseUser(prisma, token(), logger)).resolves.toBe(user);
  });
});

describe('redactEmail', () => {
  it('mantém só a inicial e o domínio', () => {
    expect(redactEmail('gustavo@projetocirurgiao.app')).toBe('g***@projetocirurgiao.app');
  });
});
