import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { LivesSavedService } from './lives-saved.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { AUDIT_ACTIONS } from '../../shared/audit/audit.constants';
import { CloudflareR2Service } from '../cloudflare/cloudflare-r2.service';

const ME = 'user-1';
const OTHER = 'user-2';
const ADMIN = 'admin-1';

function makeReport(overrides: Record<string, any> = {}) {
  return {
    id: 'r-1',
    reporterId: ME,
    status: 'DRAFT',
    source: 'SELF',
    reporterName: 'Dra. Mariana Exemplo',
    reporterCrmv: 'CRMV-SP 12345',
    reporterTitle: null,
    onBehalfOfName: null,
    attribution: 'Aprendi a gastrotomia no módulo de tecidos moles.',
    species: 'CANINE',
    speciesOther: null,
    animalName: null,
    occurredAt: null,
    procedureSummary: null,
    impactType: null,
    relatedCourseId: null,
    consentPublicStory: true,
    consentShowName: true,
    submittedAt: null,
    reviewedById: null,
    reviewedAt: null,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    media: [],
    ...overrides,
  } as any;
}

describe('LivesSavedService', () => {
  let service: LivesSavedService;
  let prisma: DeepMockProxy<PrismaService>;
  let audit: DeepMockProxy<AuditService>;
  let r2: DeepMockProxy<CloudflareR2Service>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    audit = mockDeep<AuditService>();
    r2 = mockDeep<CloudflareR2Service>();
    const module = await Test.createTestingModule({
      providers: [
        LivesSavedService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: CloudflareR2Service, useValue: r2 },
        { provide: ConfigService, useValue: { get: () => 'https://cdn.test/' } },
      ],
    }).compile();
    service = module.get(LivesSavedService);
    prisma.$transaction.mockImplementation(async (arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma)));
  });

  describe('summary', () => {
    it('conta só APPROVED não deletado', async () => {
      prisma.lifeSavedReport.count.mockResolvedValue(7);
      prisma.lifeSavedReport.findFirst.mockResolvedValue(null);
      const out = await service.summary();
      expect(out.total).toBe(7);
      expect(prisma.lifeSavedReport.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'APPROVED', deletedAt: null }) }),
      );
    });
  });

  describe('submit', () => {
    it('exige nome, CRMV e atribuição', async () => {
      prisma.lifeSavedReport.findFirst.mockResolvedValue(makeReport({ reporterCrmv: '  ', attribution: '' }));
      await expect(service.submit('r-1', ME)).rejects.toThrow(/CRMV.*atribuição/);
    });

    it('aceita atribuição de uma frase (sem mínimo de palavras)', async () => {
      prisma.lifeSavedReport.findFirst.mockResolvedValue(makeReport({ attribution: 'Sutura.' }));
      prisma.lifeSavedReport.update.mockResolvedValue(makeReport({ status: 'PENDING' }));
      prisma.userProfile.upsert.mockResolvedValue({} as any);
      const out = await service.submit('r-1', ME);
      expect(out.status).toBe('PENDING');
      expect(prisma.userProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { crmv: 'CRMV-SP 12345' } }),
      );
    });

    it('bloqueia com mídia ainda UPLOADING', async () => {
      prisma.lifeSavedReport.findFirst.mockResolvedValue(
        makeReport({ media: [{ id: 'm', kind: 'PHOTO', status: 'UPLOADING' }] }),
      );
      await expect(service.submit('r-1', ME)).rejects.toThrow(BadRequestException);
    });

    it('não deixa reenviar PENDING nem submeter relato de outro', async () => {
      prisma.lifeSavedReport.findFirst.mockResolvedValue(makeReport({ status: 'PENDING' }));
      await expect(service.submit('r-1', ME)).rejects.toThrow(/já enviado/);
      prisma.lifeSavedReport.findFirst.mockResolvedValue(makeReport({ reporterId: OTHER }));
      await expect(service.submit('r-1', ME)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('story', () => {
    it('sem consentimento público só o autor lê; nome sai anônimo sem consentShowName', async () => {
      prisma.lifeSavedReport.findFirst.mockResolvedValue(
        makeReport({ status: 'APPROVED', consentPublicStory: false }),
      );
      await expect(service.story('r-1', OTHER)).rejects.toThrow(NotFoundException);
      await expect(service.story('r-1', ME)).resolves.toMatchObject({ isMine: true });

      prisma.lifeSavedReport.findFirst.mockResolvedValue(
        makeReport({ status: 'APPROVED', consentPublicStory: true, consentShowName: false }),
      );
      const out = await service.story('r-1', OTHER);
      expect(out.reporterDisplay).toBe('Médico(a) veterinário(a)');
      expect(out.reporterCrmv).toBeNull();
      expect(out.rejectionReason).toBeNull();
    });
  });

  describe('moderação', () => {
    it('approve só de PENDING/REJECTED e registra audit', async () => {
      prisma.lifeSavedReport.findFirst.mockResolvedValue(makeReport({ status: 'DRAFT' }));
      await expect(service.approve('r-1', ADMIN)).rejects.toThrow(BadRequestException);

      prisma.lifeSavedReport.findFirst.mockResolvedValue(makeReport({ status: 'PENDING' }));
      prisma.lifeSavedReport.update.mockResolvedValue(makeReport({ status: 'APPROVED' }));
      await service.approve('r-1', ADMIN);
      expect(prisma.lifeSavedReport.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED', reviewedById: ADMIN }) }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AUDIT_ACTIONS.LIVES_SAVED_APPROVE, entityId: 'r-1' }),
      );
    });

    it('backfill do admin dispensa CRMV e nasce APPROVED', async () => {
      (prisma.lifeSavedReport.create as any).mockImplementation(async ({ data }: any) => ({ ...makeReport(), ...data, media: [] }));
      const out = await service.adminCreate(ADMIN, {
        reporterName: 'Dr. Histórico',
        attribution: 'Caso de 2021.',
        onBehalfOfName: 'Dr. Histórico',
      } as any);
      expect(out.status).toBe('APPROVED');
      expect(out.source).toBe('ADMIN_BACKFILL');
      const data = (prisma.lifeSavedReport.create as any).mock.calls[0][0].data;
      expect(data.reviewedBy).toEqual({ connect: { id: ADMIN } });
      expect(data.reporter).toEqual({ connect: { id: ADMIN } });
    });
  });

  describe('mídia', () => {
    it('rejeita mime fora da lista, acima do teto e além do máximo de arquivos', async () => {
      prisma.lifeSavedReport.findFirst.mockResolvedValue(makeReport());
      await expect(
        service.mediaUploadUrl('r-1', ME, { kind: 'PHOTO', mimeType: 'image/gif', sizeBytes: 10 } as any),
      ).rejects.toThrow(/Tipo não aceito/);
      await expect(
        service.mediaUploadUrl('r-1', ME, { kind: 'VIDEO', mimeType: 'video/mp4', sizeBytes: 600 * 1024 * 1024 } as any),
      ).rejects.toThrow(/acima de 500 MB/);
      prisma.lifeSavedReport.findFirst.mockResolvedValue(
        makeReport({ media: Array.from({ length: 3 }, (_, i) => ({ id: `v${i}`, kind: 'VIDEO', status: 'READY' })) }),
      );
      await expect(
        service.mediaUploadUrl('r-1', ME, { kind: 'VIDEO', mimeType: 'video/mp4', sizeBytes: 10 } as any),
      ).rejects.toThrow(/Máximo de 3/);
    });

    it('gera chave em lives-saved/<reportId>/ e URL pública sem barra dupla', async () => {
      prisma.lifeSavedReport.findFirst.mockResolvedValue(makeReport());
      (prisma.lifeSavedReportMedia.create as any).mockImplementation(async ({ data }: any) => ({ id: 'm-1', ...data }));
      r2.getSignedUploadUrl.mockResolvedValue('https://r2/signed');
      const out = await service.mediaUploadUrl('r-1', ME, { kind: 'PHOTO', mimeType: 'image/jpeg', sizeBytes: 10 } as any);
      expect(out.key).toMatch(/^lives-saved\/r-1\/[0-9a-f-]{36}\.jpg$/);
      expect(out.url).toBe('https://r2/signed');
      const created = prisma.lifeSavedReportMedia.create.mock.calls[0][0].data as any;
      expect(created.url).toBe(`https://cdn.test/${out.key}`);
    });

    it('confirm falha se o objeto não está no R2', async () => {
      prisma.lifeSavedReport.findFirst.mockResolvedValue(makeReport());
      prisma.lifeSavedReportMedia.findFirst.mockResolvedValue({ id: 'm-1', reportId: 'r-1', r2Key: 'k', mimeType: 'image/jpeg' } as any);
      r2.getFileMetadata.mockRejectedValue(new BadRequestException('nope'));
      await expect(service.mediaConfirm('r-1', 'm-1', ME)).rejects.toThrow(/ainda não chegou/);
    });
  });

  describe('anonymizeReporter', () => {
    it('apaga mídia no R2 e no banco e anonimiza os campos do autor', async () => {
      prisma.lifeSavedReportMedia.findMany.mockResolvedValue([{ id: 'm', r2Key: 'lives-saved/r-1/a.jpg' }] as any);
      prisma.lifeSavedReportMedia.deleteMany.mockResolvedValue({ count: 1 });
      prisma.lifeSavedReport.updateMany.mockResolvedValue({ count: 1 });
      r2.deleteFile.mockResolvedValue();
      await service.anonymizeReporter(ME);
      expect(r2.deleteFile).toHaveBeenCalledWith('lives-saved/r-1/a.jpg');
      expect(prisma.lifeSavedReport.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reporterCrmv: null, consentShowName: false }),
        }),
      );
    });
  });
});
