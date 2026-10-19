import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { ApplePurchasesService } from './apple-purchases.service';
import { AccessService } from './access.service';
import { PrismaService } from '../../shared/prisma/prisma.service';

const verifyAndDecodeTransaction = jest.fn();
const verifyAndDecodeNotification = jest.fn();
jest.mock('@apple/app-store-server-library', () => ({
  Environment: { SANDBOX: 'Sandbox', PRODUCTION: 'Production' },
  NotificationTypeV2: { REFUND: 'REFUND', REVOKE: 'REVOKE', DID_RENEW: 'DID_RENEW' },
  SignedDataVerifier: jest.fn().mockImplementation(() => ({
    verifyAndDecodeTransaction,
    verifyAndDecodeNotification,
  })),
}));

const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' });

describe('ApplePurchasesService', () => {
  let service: ApplePurchasesService;
  let prisma: DeepMockProxy<PrismaService>;
  let access: DeepMockProxy<AccessService>;

  const tx = {
    productId: 'showcase.castracao',
    transactionId: 't-2',
    originalTransactionId: 't-1',
    bundleId: 'app.projetocirurgiao.mobile',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = mockDeep<PrismaService>();
    access = mockDeep<AccessService>();
    access.reconcileEnrollments.mockResolvedValue({ suspended: 0, restored: 0 });
    const module = await Test.createTestingModule({
      providers: [
        ApplePurchasesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccessService, useValue: access },
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) =>
              ({ APPLE_BUNDLE_ID: 'app.projetocirurgiao.mobile', APPLE_APP_ID: '6808997426' })[k],
          },
        },
      ],
    }).compile();
    service = module.get(ApplePurchasesService);
  });

  describe('verifyAndGrant', () => {
    it('aceita JWS de Sandbox quando Produção recusa (App Review / TestFlight)', async () => {
      verifyAndDecodeTransaction
        .mockRejectedValueOnce(Object.assign(new Error(''), { status: 4 }))
        .mockResolvedValueOnce({ ...tx, environment: 'Sandbox' });
      prisma.showcase.findUnique.mockResolvedValue({ id: 's1', slug: 'castracao', title: 'C' } as never);
      prisma.webhookEvent.create.mockResolvedValue({} as never);
      prisma.entitlement.upsert.mockResolvedValue({} as never);
      prisma.webhookEvent.update.mockResolvedValue({} as never);

      await expect(service.verifyAndGrant('u1', 'jws')).resolves.toMatchObject({ ok: true, showcaseSlug: 'castracao' });
      expect(verifyAndDecodeTransaction).toHaveBeenCalledTimes(2);
    });

    it('concede a vitrine do productId e realinha matrículas', async () => {
      verifyAndDecodeTransaction.mockResolvedValue(tx);
      prisma.showcase.findUnique.mockResolvedValue({ id: 's1', slug: 'castracao', title: 'Castração' } as never);
      prisma.webhookEvent.create.mockResolvedValue({} as never);
      prisma.entitlement.upsert.mockResolvedValue({} as never);
      prisma.webhookEvent.update.mockResolvedValue({} as never);

      await expect(service.verifyAndGrant('u1', 'jws')).resolves.toEqual({ ok: true, showcaseSlug: 'castracao' });

      expect(prisma.entitlement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_showcaseId: { userId: 'u1', showcaseId: 's1' } },
          create: expect.objectContaining({ source: 'PURCHASE', externalOrderId: 't-1', expiresAt: null }),
          update: expect.objectContaining({ revokedAt: null, externalOrderId: 't-1' }),
        }),
      );
      expect(access.reconcileEnrollments).toHaveBeenCalledWith('u1');
      expect(prisma.webhookEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ provider: 'apple', externalId: 'purchase:t-2' }) }),
      );
    });

    it('transação repetida não concede de novo (dedupe pelo transactionId)', async () => {
      verifyAndDecodeTransaction.mockResolvedValue(tx);
      prisma.showcase.findUnique.mockResolvedValue({ id: 's1', slug: 'castracao', title: 'C' } as never);
      prisma.webhookEvent.create.mockRejectedValue(p2002());

      await expect(service.verifyAndGrant('u1', 'jws')).resolves.toEqual({ ok: true, showcaseSlug: 'castracao', deduped: true });
      expect(prisma.entitlement.upsert).not.toHaveBeenCalled();
    });

    it('JWS inválido → 400, nada gravado', async () => {
      verifyAndDecodeTransaction.mockRejectedValue(new Error('bad sig'));
      await expect(service.verifyAndGrant('u1', 'jws')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
    });

    it('produto sem vitrine vinculada → 400', async () => {
      verifyAndDecodeTransaction.mockResolvedValue(tx);
      prisma.showcase.findUnique.mockResolvedValue(null);
      await expect(service.verifyAndGrant('u1', 'jws')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('handleNotification', () => {
    it('REFUND revoga o entitlement do originalTransactionId e suspende matrículas', async () => {
      verifyAndDecodeNotification.mockResolvedValue({
        notificationType: 'REFUND',
        notificationUUID: 'n1',
        data: { signedTransactionInfo: 'signed-tx' },
      });
      verifyAndDecodeTransaction.mockResolvedValue(tx);
      prisma.webhookEvent.create.mockResolvedValue({} as never);
      prisma.webhookEvent.update.mockResolvedValue({} as never);
      prisma.entitlement.findMany.mockResolvedValue([{ id: 'e1', userId: 'u1' }] as never);
      prisma.entitlement.update.mockResolvedValue({} as never);
      access.reconcileEnrollments.mockResolvedValue({ suspended: 1, restored: 0 });

      await expect(service.handleNotification('payload')).resolves.toEqual({ ok: true });

      expect(prisma.entitlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { externalOrderId: 't-1', revokedAt: null } }),
      );
      expect(prisma.entitlement.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { revokedAt: expect.any(Date), revokedReason: 'apple:REFUND' },
      });
      expect(access.reconcileEnrollments).toHaveBeenCalledWith('u1');
    });

    it('tipo não tratado só fica registrado', async () => {
      verifyAndDecodeNotification.mockResolvedValue({ notificationType: 'DID_RENEW', notificationUUID: 'n2', data: {} });
      prisma.webhookEvent.create.mockResolvedValue({} as never);
      prisma.webhookEvent.update.mockResolvedValue({} as never);

      await expect(service.handleNotification('payload')).resolves.toEqual({ ok: true, ignored: true });
      expect(prisma.entitlement.update).not.toHaveBeenCalled();
    });

    it('assinatura inválida responde ok com error (Apple não deve reenviar em loop)', async () => {
      verifyAndDecodeNotification.mockRejectedValue(new Error('bad'));
      await expect(service.handleNotification('payload')).resolves.toEqual({ ok: true, error: 'invalid signature' });
    });
  });
});
