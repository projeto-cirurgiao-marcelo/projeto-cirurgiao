import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';
import { LivesSavedReadGuard } from './lives-saved-read.guard';
import { LivesSavedService } from './lives-saved.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';

function ctxWith(headers: Record<string, string>) {
  const req: any = { headers };
  return { req, ctx: { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext };
}

describe('LivesSavedReadGuard', () => {
  const prisma = mockDeep<PrismaService>();
  const firebase = mockDeep<FirebaseAuthGuard>();
  const guard = new LivesSavedReadGuard(prisma, firebase);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.displayToken.update.mockReturnValue({ catch: () => undefined } as any);
  });

  it('sem header cai no Firebase', async () => {
    firebase.canActivate.mockResolvedValue(true as never);
    const { ctx } = ctxWith({});
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(firebase.canActivate).toHaveBeenCalled();
    expect(prisma.displayToken.findFirst).not.toHaveBeenCalled();
  });

  it('com token válido autentica como DISPLAY sem tocar no Firebase', async () => {
    prisma.displayToken.findFirst.mockResolvedValue({ id: 't-1' } as any);
    const { ctx, req } = ctxWith({ 'x-display-token': 'abc' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(firebase.canActivate).not.toHaveBeenCalled();
    expect(prisma.displayToken.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: LivesSavedService.hashDisplayToken('abc'), revokedAt: null } }),
    );
    expect(req.user.role).toBe('DISPLAY');
  });

  it('token revogado/inexistente → 401', async () => {
    prisma.displayToken.findFirst.mockResolvedValue(null);
    const { ctx } = ctxWith({ 'x-display-token': 'nope' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
