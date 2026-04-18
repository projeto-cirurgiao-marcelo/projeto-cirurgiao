import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Video } from '@prisma/client';

import { VideosService } from './videos.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CloudflareStreamService } from '../cloudflare/cloudflare-stream.service';
import { CloudflareR2Service } from '../cloudflare/cloudflare-r2.service';
import { AuditService } from '../../shared/audit/audit.service';
import { VideoSource, VideoUploadStatus } from './dto/create-video.dto';
import { CreateVideoFromR2HlsDto } from './dto/create-video-from-r2-hls.dto';

/**
 * Builds a fully-populated Video row. The real Prisma type has more
 * fields than any single test cares about — factory fills in sensible
 * defaults so each test only overrides what it needs.
 */
function makeVideo(overrides: Partial<Video> = {}): Video {
  return {
    id: 'video-id',
    title: 'Video title',
    description: null,
    cloudflareId: null,
    cloudflareUrl: null,
    thumbnailUrl: null,
    duration: 0,
    moduleId: 'module-id',
    order: 0,
    isPublished: false,
    uploadStatus: 'READY',
    uploadProgress: 100,
    uploadError: null,
    tempFilePath: null,
    externalUrl: null,
    hlsUrl: null,
    videoSource: 'cloudflare',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Video;
}

describe('VideosService', () => {
  let service: VideosService;
  let prisma: DeepMockProxy<PrismaService>;
  let cloudflareStream: DeepMockProxy<CloudflareStreamService>;
  let cloudflareR2: DeepMockProxy<CloudflareR2Service>;
  let audit: DeepMockProxy<AuditService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    cloudflareStream = mockDeep<CloudflareStreamService>();
    cloudflareR2 = mockDeep<CloudflareR2Service>();
    audit = mockDeep<AuditService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideosService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudflareStreamService, useValue: cloudflareStream },
        { provide: CloudflareR2Service, useValue: cloudflareR2 },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(VideosService);
  });

  // ============================================
  // buildPlaybackUrls — each of the 5 videoSource values
  // ============================================
  describe('buildPlaybackUrls', () => {
    it('cloudflare: uses cloudflareUrl + exposes a captions endpoint', () => {
      const video = makeVideo({
        videoSource: 'cloudflare',
        cloudflareId: 'cf-abc',
        cloudflareUrl: 'https://stream.cloudflare.com/cf-abc/manifest/video.m3u8',
        thumbnailUrl: 'https://cdn.example/poster.jpg',
      });

      const urls = service.buildPlaybackUrls(video);

      expect(urls.playbackUrl).toBe(video.cloudflareUrl);
      expect(urls.captionsUrl).toBe(`/api/v1/captions/${video.id}/pt-BR`);
      expect(urls.poster).toBe(video.thumbnailUrl);
    });

    it('cloudflare: omits captionsUrl when cloudflareId is missing', () => {
      const video = makeVideo({
        videoSource: 'cloudflare',
        cloudflareId: null,
        cloudflareUrl: null,
      });

      const urls = service.buildPlaybackUrls(video);

      expect(urls.playbackUrl).toBeNull();
      expect(urls.captionsUrl).toBeUndefined();
    });

    it.each(['youtube', 'vimeo', 'external'])(
      '%s: playbackUrl = externalUrl, captionsUrl = undefined',
      (source) => {
        const video = makeVideo({
          videoSource: source,
          externalUrl: `https://${source}.example/xyz`,
        });

        const urls = service.buildPlaybackUrls(video);

        expect(urls.playbackUrl).toBe(video.externalUrl);
        expect(urls.captionsUrl).toBeUndefined();
      },
    );

    it('r2_hls: playbackUrl = hlsUrl, captionsUrl stays undefined (SUBTITLES group is embedded)', () => {
      const video = makeVideo({
        videoSource: 'r2_hls',
        hlsUrl: 'https://cdn.example.com/videos/abc/playlist.m3u8',
        thumbnailUrl: 'https://cdn.example.com/videos/abc/thumb.jpg',
      });

      const urls = service.buildPlaybackUrls(video);

      expect(urls.playbackUrl).toBe(video.hlsUrl);
      expect(urls.captionsUrl).toBeUndefined();
      expect(urls.poster).toBe(video.thumbnailUrl);
    });
  });

  // ============================================
  // create — persistence per source
  // ============================================
  describe('create', () => {
    beforeEach(() => {
      prisma.module.findUnique.mockResolvedValue({
        id: 'module-id',
        courseId: 'course-id',
      } as any);
      prisma.video.findFirst.mockResolvedValue(null);
      prisma.video.findUnique.mockResolvedValue(null);
    });

    it('persists cloudflare source with cloudflareId/cloudflareUrl', async () => {
      const created = makeVideo({
        videoSource: 'cloudflare',
        cloudflareId: 'cf-1',
        cloudflareUrl: 'https://stream.example/video.m3u8',
      });
      prisma.video.create.mockResolvedValue(created);

      await service.create('module-id', {
        title: 'Video',
        order: 0,
        cloudflareId: 'cf-1',
        cloudflareUrl: 'https://stream.example/video.m3u8',
        videoSource: VideoSource.CLOUDFLARE,
        uploadStatus: VideoUploadStatus.READY,
      });

      const passed = prisma.video.create.mock.calls[0][0].data as any;
      expect(passed.cloudflareId).toBe('cf-1');
      expect(passed.cloudflareUrl).toBe('https://stream.example/video.m3u8');
      expect(passed.videoSource).toBe('cloudflare');
      expect(passed.hlsUrl).toBeUndefined();
    });

    it('persists external/youtube source with externalUrl + videoSource', async () => {
      const created = makeVideo({
        videoSource: 'youtube',
        externalUrl: 'https://youtu.be/abc',
      });
      prisma.video.create.mockResolvedValue(created);

      await service.create('module-id', {
        title: 'Yt video',
        order: 0,
        externalUrl: 'https://youtu.be/abc',
        videoSource: VideoSource.YOUTUBE,
      });

      const passed = prisma.video.create.mock.calls[0][0].data as any;
      expect(passed.externalUrl).toBe('https://youtu.be/abc');
      expect(passed.videoSource).toBe('youtube');
    });

    it('rejects when an order conflict already exists', async () => {
      prisma.video.findFirst.mockResolvedValue(makeVideo({ order: 3 }));

      await expect(
        service.create('module-id', { title: 'T', order: 3 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when the module does not exist', async () => {
      prisma.module.findUnique.mockResolvedValue(null);

      await expect(
        service.create('missing-module', { title: 'T', order: 0 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // createFromR2Hls — the new endpoint's happy path
  // ============================================
  describe('createFromR2Hls', () => {
    beforeEach(() => {
      prisma.module.findUnique.mockResolvedValue({
        id: 'module-id',
        courseId: 'course-id',
      } as any);
      prisma.video.findFirst.mockResolvedValue(null);
    });

    it('persists videoSource=r2_hls + uploadStatus=READY with hlsUrl', async () => {
      const created = makeVideo({
        videoSource: 'r2_hls',
        hlsUrl: 'https://cdn.example/videos/xyz/playlist.m3u8',
        duration: 600,
        uploadStatus: 'READY',
      });
      prisma.video.create.mockResolvedValue(created);

      const result = await service.createFromR2Hls('module-id', {
        hlsUrl: 'https://cdn.example/videos/xyz/playlist.m3u8',
        duration: 600,
        title: 'R2 HLS video',
      });

      const data = prisma.video.create.mock.calls[0][0].data as any;
      expect(data.videoSource).toBe(VideoSource.R2_HLS);
      expect(data.hlsUrl).toBe('https://cdn.example/videos/xyz/playlist.m3u8');
      expect(data.uploadStatus).toBe('READY');
      expect(data.uploadProgress).toBe(100);
      expect(data.duration).toBe(600);
      expect(result).toEqual(created);
    });

    it('auto-assigns order when caller omits it', async () => {
      prisma.video.findFirst
        .mockResolvedValueOnce(makeVideo({ order: 7 })) // getNextOrder lookup
        .mockResolvedValueOnce(null); // conflict lookup
      prisma.video.create.mockResolvedValue(makeVideo({ order: 8 }));

      await service.createFromR2Hls('module-id', {
        hlsUrl: 'https://cdn.example/playlist.m3u8',
        duration: 120,
        title: 't',
      });

      const data = prisma.video.create.mock.calls[0][0].data as any;
      expect(data.order).toBe(8);
    });

    it('rejects when order conflicts with an existing video', async () => {
      prisma.video.findFirst.mockResolvedValue(makeVideo({ order: 0 }));

      await expect(
        service.createFromR2Hls('module-id', {
          hlsUrl: 'https://cdn.example/playlist.m3u8',
          duration: 120,
          title: 't',
          order: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when the module does not exist', async () => {
      prisma.module.findUnique.mockResolvedValue(null);

      await expect(
        service.createFromR2Hls('missing', {
          hlsUrl: 'https://cdn.example/playlist.m3u8',
          duration: 120,
          title: 't',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // DTO validation — malformed hlsUrl
  // ============================================
  describe('CreateVideoFromR2HlsDto validation', () => {
    const base = {
      duration: 120,
      title: 'valid title',
    };

    it('accepts a well-formed .m3u8 URL', async () => {
      const dto = plainToInstance(CreateVideoFromR2HlsDto, {
        ...base,
        hlsUrl: 'https://cdn.example.com/videos/abc/playlist.m3u8',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects URL not ending in .m3u8', async () => {
      const dto = plainToInstance(CreateVideoFromR2HlsDto, {
        ...base,
        hlsUrl: 'https://cdn.example.com/videos/abc/video.mp4',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('matches');
    });

    it('rejects a non-URL string', async () => {
      const dto = plainToInstance(CreateVideoFromR2HlsDto, {
        ...base,
        hlsUrl: 'not-a-url',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects zero or negative duration', async () => {
      const dto = plainToInstance(CreateVideoFromR2HlsDto, {
        ...base,
        hlsUrl: 'https://cdn.example.com/videos/abc/playlist.m3u8',
        duration: 0,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'duration')).toBe(true);
    });

    it('rejects missing title', async () => {
      const dto = plainToInstance(CreateVideoFromR2HlsDto, {
        hlsUrl: 'https://cdn.example.com/videos/abc/playlist.m3u8',
        duration: 120,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'title')).toBe(true);
    });
  });

  // ============================================
  // Soft-delete (Task 9)
  // ============================================
  describe('remove (soft-delete)', () => {
    it('marks deletedAt + records audit, never calls prisma.video.delete', async () => {
      prisma.video.findUnique.mockResolvedValue(makeVideo());
      prisma.video.update.mockResolvedValue(makeVideo({ deletedAt: new Date() }));

      await service.remove('video-id', 'actor-1');

      const updateCall = prisma.video.update.mock.calls[0][0];
      expect((updateCall.data as any).deletedAt).toBeInstanceOf(Date);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'actor-1',
          entityType: 'videos',
          entityId: 'video-id',
        }),
      );
      expect(prisma.video.delete).not.toHaveBeenCalled();
    });

    it('throws NotFound when video already soft-deleted', async () => {
      prisma.video.findUnique.mockResolvedValue(
        makeVideo({ deletedAt: new Date() }),
      );
      await expect(service.remove('video-id')).rejects.toThrow(NotFoundException);
      expect(prisma.video.update).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  describe('findAll / findOne exclude soft-deleted', () => {
    it('findAll passes deletedAt: null to prisma', async () => {
      prisma.module.findUnique.mockResolvedValue({ id: 'module-id' } as any);
      prisma.video.findMany.mockResolvedValue([]);

      await service.findAll('module-id');

      const where = prisma.video.findMany.mock.calls[0][0]!.where as any;
      expect(where.deletedAt).toBeNull();
      expect(where.moduleId).toBe('module-id');
    });

    it('findOne hides soft-deleted rows as NotFound', async () => {
      prisma.video.findUnique.mockResolvedValue(
        makeVideo({ deletedAt: new Date() }),
      );
      await expect(service.findOne('video-id')).rejects.toThrow(NotFoundException);
    });
  });
});
