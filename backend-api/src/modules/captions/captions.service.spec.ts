import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { CaptionsService } from './captions.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CloudflareStreamService } from '../cloudflare/cloudflare-stream.service';

function videoRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'v1',
    cloudflareId: 'cf-abc',
    uploadStatus: 'READY',
    ...overrides,
  };
}

describe('CaptionsService', () => {
  let service: CaptionsService;
  let prisma: DeepMockProxy<PrismaService>;
  let stream: DeepMockProxy<CloudflareStreamService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    stream = mockDeep<CloudflareStreamService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaptionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudflareStreamService, useValue: stream },
      ],
    }).compile();
    service = module.get(CaptionsService);
  });

  describe('generateCaption', () => {
    it('throws NotFound when video missing', async () => {
      prisma.video.findUnique.mockResolvedValue(null);
      await expect(service.generateCaption('v1')).rejects.toThrow(NotFoundException);
    });

    it('rejects videos without cloudflareId', async () => {
      prisma.video.findUnique.mockResolvedValue(
        videoRow({ cloudflareId: null }) as any,
      );
      await expect(service.generateCaption('v1')).rejects.toThrow(
        BadRequestException,
      );
      expect(stream.generateCaptions).not.toHaveBeenCalled();
    });

    it('rejects videos not in READY state', async () => {
      prisma.video.findUnique.mockResolvedValue(
        videoRow({ uploadStatus: 'PROCESSING' }) as any,
      );
      await expect(service.generateCaption('v1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects unsupported language', async () => {
      prisma.video.findUnique.mockResolvedValue(videoRow() as any);
      await expect(service.generateCaption('v1', 'xx' as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('forwards to CloudflareStreamService on the happy path', async () => {
      prisma.video.findUnique.mockResolvedValue(videoRow() as any);
      stream.generateCaptions.mockResolvedValue({
        language: 'pt',
        label: 'Portuguese',
        status: 'inprogress',
      } as any);

      const out = await service.generateCaption('v1', 'pt');

      expect(stream.generateCaptions).toHaveBeenCalledWith('cf-abc', 'pt');
      expect(out.status).toBe('inprogress');
    });

    it('wraps upstream errors as BadRequest', async () => {
      prisma.video.findUnique.mockResolvedValue(videoRow() as any);
      stream.generateCaptions.mockRejectedValue(new Error('cloudflare 500'));

      await expect(service.generateCaption('v1', 'pt')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listCaptions', () => {
    it('throws NotFound when video missing', async () => {
      prisma.video.findUnique.mockResolvedValue(null);
      await expect(service.listCaptions('v1')).rejects.toThrow(NotFoundException);
    });

    it('returns [] when video has no cloudflareId', async () => {
      prisma.video.findUnique.mockResolvedValue(
        videoRow({ cloudflareId: null }) as any,
      );

      const out = await service.listCaptions('v1');
      expect(out).toEqual([]);
      expect(stream.listCaptions).not.toHaveBeenCalled();
    });

    it('returns [] when upstream fails (swallows errors)', async () => {
      prisma.video.findUnique.mockResolvedValue(videoRow() as any);
      stream.listCaptions.mockRejectedValue(new Error('network'));

      const out = await service.listCaptions('v1');
      expect(out).toEqual([]);
    });

    it('passes through upstream list on the happy path', async () => {
      prisma.video.findUnique.mockResolvedValue(videoRow() as any);
      stream.listCaptions.mockResolvedValue([
        { language: 'pt', label: 'PT', status: 'ready' },
      ] as any);

      const out = await service.listCaptions('v1');
      expect(out).toEqual([{ language: 'pt', label: 'PT', status: 'ready' }]);
    });
  });

  describe('getCaptionVtt', () => {
    it('throws NotFound when video missing', async () => {
      prisma.video.findUnique.mockResolvedValue(null);
      await expect(service.getCaptionVtt('v1', 'pt')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects videos without cloudflareId', async () => {
      prisma.video.findUnique.mockResolvedValue(
        videoRow({ cloudflareId: null }) as any,
      );
      await expect(service.getCaptionVtt('v1', 'pt')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('passes through the VTT payload', async () => {
      prisma.video.findUnique.mockResolvedValue(videoRow() as any);
      stream.getCaptionVtt.mockResolvedValue('WEBVTT\n\n…');

      const out = await service.getCaptionVtt('v1', 'pt');
      expect(out).toBe('WEBVTT\n\n…');
    });
  });

  describe('deleteCaption', () => {
    it('throws NotFound when video missing', async () => {
      prisma.video.findUnique.mockResolvedValue(null);
      await expect(service.deleteCaption('v1', 'pt')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects videos without cloudflareId', async () => {
      prisma.video.findUnique.mockResolvedValue(
        videoRow({ cloudflareId: null }) as any,
      );
      await expect(service.deleteCaption('v1', 'pt')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('happy path calls cloudflare delete', async () => {
      prisma.video.findUnique.mockResolvedValue(videoRow() as any);
      stream.deleteCaption.mockResolvedValue(undefined as any);

      await service.deleteCaption('v1', 'pt');

      expect(stream.deleteCaption).toHaveBeenCalledWith('cf-abc', 'pt');
    });
  });

  describe('getCaptionStatus', () => {
    it('returns the matching caption when present', async () => {
      prisma.video.findUnique.mockResolvedValue(videoRow() as any);
      stream.listCaptions.mockResolvedValue([
        { language: 'pt', label: 'PT', status: 'ready' },
        { language: 'en', label: 'EN', status: 'ready' },
      ] as any);

      const out = await service.getCaptionStatus('v1', 'pt');
      expect(out?.language).toBe('pt');
    });

    it('returns null when caption not found', async () => {
      prisma.video.findUnique.mockResolvedValue(videoRow() as any);
      stream.listCaptions.mockResolvedValue([] as any);

      const out = await service.getCaptionStatus('v1', 'pt');
      expect(out).toBeNull();
    });
  });
});
