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
  // buildPlaybackUrls — kind + captionsEmbedded contract
  // ============================================
  describe('buildPlaybackUrls', () => {
    it('cloudflare ready: kind=hls, captionsEmbedded=false, exposes captionsUrl', () => {
      const video = makeVideo({
        videoSource: 'cloudflare',
        cloudflareId: 'cf-abc',
        cloudflareUrl: 'https://stream.cloudflare.com/cf-abc/manifest/video.m3u8',
        thumbnailUrl: 'https://cdn.example/poster.jpg',
      });

      const urls = service.buildPlaybackUrls(video);

      expect(urls.kind).toBe('hls');
      expect(urls.playbackUrl).toBe(video.cloudflareUrl);
      // Cloudflare delivers CC as a separate track in the manifest but we
      // still set captionsEmbedded=false — clients that want good CC
      // fidelity should hit captionsUrl.
      expect(urls.captionsEmbedded).toBe(false);
      expect(urls.captionsUrl).toBe(`/api/v1/captions/${video.id}/pt-BR`);
      expect(urls.poster).toBe(video.thumbnailUrl);
    });

    it('cloudflare pending (no cloudflareUrl yet): kind=none, playbackUrl=null, no captions fields', () => {
      const video = makeVideo({
        videoSource: 'cloudflare',
        cloudflareId: null,
        cloudflareUrl: null,
      });

      const urls = service.buildPlaybackUrls(video);

      expect(urls.kind).toBe('none');
      expect(urls.playbackUrl).toBeNull();
      expect(urls.captionsEmbedded).toBeUndefined();
      expect(urls.captionsUrl).toBeUndefined();
    });

    it.each(['youtube', 'vimeo', 'external'])(
      '%s: kind=iframe, playbackUrl=externalUrl, captionsEmbedded=undefined',
      (source) => {
        const video = makeVideo({
          videoSource: source,
          externalUrl: `https://${source}.example/xyz`,
        });

        const urls = service.buildPlaybackUrls(video);

        expect(urls.kind).toBe('iframe');
        expect(urls.playbackUrl).toBe(video.externalUrl);
        expect(urls.captionsEmbedded).toBeUndefined();
        expect(urls.captionsUrl).toBeUndefined();
      },
    );

    it('iframe sources without externalUrl fall back to kind=none', () => {
      const video = makeVideo({
        videoSource: 'youtube',
        externalUrl: null,
      });

      const urls = service.buildPlaybackUrls(video);

      expect(urls.kind).toBe('none');
      expect(urls.playbackUrl).toBeNull();
    });

    it('r2_hls: kind=hls, playbackUrl=hlsUrl, captionsEmbedded=true, no captionsUrl', () => {
      const video = makeVideo({
        videoSource: 'r2_hls',
        hlsUrl: 'https://cdn.example.com/videos/abc/playlist.m3u8',
        thumbnailUrl: 'https://cdn.example.com/videos/abc/thumb.jpg',
      });

      const urls = service.buildPlaybackUrls(video);

      expect(urls.kind).toBe('hls');
      expect(urls.playbackUrl).toBe(video.hlsUrl);
      // SUBTITLES group embedded in the master playlist — player switches
      // tracks directly, no separate URL needed.
      expect(urls.captionsEmbedded).toBe(true);
      expect(urls.captionsUrl).toBeUndefined();
      expect(urls.poster).toBe(video.thumbnailUrl);
    });

    it('r2_hls without hlsUrl: kind=none (pipeline not published yet)', () => {
      const video = makeVideo({
        videoSource: 'r2_hls',
        hlsUrl: null,
      });

      const urls = service.buildPlaybackUrls(video);

      expect(urls.kind).toBe('none');
      expect(urls.playbackUrl).toBeNull();
      expect(urls.captionsEmbedded).toBeUndefined();
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

    it('findAll rejects when parent module does not exist', async () => {
      prisma.module.findUnique.mockResolvedValue(null);
      await expect(service.findAll('missing')).rejects.toThrow(NotFoundException);
    });

    it('findOne hides soft-deleted rows as NotFound', async () => {
      prisma.video.findUnique.mockResolvedValue(
        makeVideo({ deletedAt: new Date() }),
      );
      await expect(service.findOne('video-id')).rejects.toThrow(NotFoundException);
    });

    it('findOne auto-syncs duration from Cloudflare when DB has 0', async () => {
      prisma.video.findUnique.mockResolvedValue(
        makeVideo({
          cloudflareId: 'cf-1',
          uploadStatus: 'READY',
          duration: 0,
        }),
      );
      cloudflareStream.getVideoDetails.mockResolvedValue({
        duration: 90,
        thumbnailUrl: 'https://cf/thumb.jpg',
      } as any);
      prisma.video.update.mockResolvedValue({} as any);

      const out = await service.findOne('video-id');

      expect(cloudflareStream.getVideoDetails).toHaveBeenCalledWith('cf-1');
      expect(prisma.video.update).toHaveBeenCalled();
      expect(out.duration).toBe(90);
    });

    it('findOne tolerates Cloudflare failures during auto-sync', async () => {
      prisma.video.findUnique.mockResolvedValue(
        makeVideo({
          cloudflareId: 'cf-1',
          uploadStatus: 'READY',
          duration: 0,
        }),
      );
      cloudflareStream.getVideoDetails.mockRejectedValue(new Error('cf-down'));

      // Should NOT throw — auto-sync is best-effort.
      const out = await service.findOne('video-id');
      expect(out.duration).toBe(0);
    });

    it('findOneWithPlayback delegates to findOne + withPlayback', async () => {
      prisma.video.findUnique.mockResolvedValue(
        makeVideo({ videoSource: 'r2_hls', hlsUrl: 'https://r2/p.m3u8' }),
      );

      const out = await service.findOneWithPlayback('video-id');
      expect(out.playback.kind).toBe('hls');
      expect(out.playback.playbackUrl).toBe('https://r2/p.m3u8');
    });

    it('findAllWithPlayback attaches playback to every item', async () => {
      prisma.module.findUnique.mockResolvedValue({ id: 'module-id' } as any);
      prisma.video.findMany.mockResolvedValue([
        makeVideo({ id: 'v1', videoSource: 'r2_hls', hlsUrl: 'https://r2/a.m3u8' }),
        makeVideo({ id: 'v2', videoSource: 'youtube', externalUrl: 'https://y/1' }),
      ]);

      const out = await service.findAllWithPlayback('module-id');
      expect(out).toHaveLength(2);
      expect(out[0].playback.kind).toBe('hls');
      expect(out[1].playback.kind).toBe('iframe');
    });
  });

  // ============================================
  // update
  // ============================================
  describe('update', () => {
    it('updates fields without order change', async () => {
      prisma.video.findUnique.mockResolvedValue(makeVideo({ order: 2 }));
      prisma.video.update.mockResolvedValue(
        makeVideo({ order: 2, title: 'Novo' }),
      );

      await service.update('video-id', { title: 'Novo' } as any);

      expect(prisma.video.findFirst).not.toHaveBeenCalled();
      expect(prisma.video.update).toHaveBeenCalled();
    });

    it('rejects when new order conflicts with another video in the module', async () => {
      prisma.video.findUnique.mockResolvedValue(makeVideo({ order: 2 }));
      prisma.video.findFirst.mockResolvedValue(
        makeVideo({ id: 'other', order: 3 }),
      );

      await expect(
        service.update('video-id', { order: 3 } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.video.update).not.toHaveBeenCalled();
    });

    it('allows keeping the same order without a conflict check', async () => {
      prisma.video.findUnique.mockResolvedValue(makeVideo({ order: 2 }));
      prisma.video.update.mockResolvedValue(makeVideo({ order: 2 }));

      await service.update('video-id', { order: 2 } as any);

      expect(prisma.video.findFirst).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // reorder / togglePublish
  // ============================================
  describe('reorder', () => {
    it('rejects when module does not exist', async () => {
      prisma.module.findUnique.mockResolvedValue(null);
      await expect(
        service.reorder('missing', { videos: [] } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('runs every update inside a $transaction and returns findAll result', async () => {
      prisma.module.findUnique.mockResolvedValue({ id: 'module-id' } as any);
      prisma.video.findMany.mockResolvedValue([]);
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));

      await service.reorder('module-id', {
        videos: [{ id: 'a', order: 0 }, { id: 'b', order: 1 }],
      } as any);

      // 2 updates x 2 passes (negative then final) = 4 calls.
      expect(prisma.video.update).toHaveBeenCalledTimes(4);
    });

    it('wraps transaction failures in BadRequestException', async () => {
      prisma.module.findUnique.mockResolvedValue({ id: 'module-id' } as any);
      prisma.$transaction.mockRejectedValue(new Error('tx failed'));

      await expect(
        service.reorder('module-id', {
          videos: [{ id: 'a', order: 0 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('togglePublish', () => {
    it('flips isPublished', async () => {
      prisma.video.findUnique.mockResolvedValue(makeVideo({ isPublished: false }));
      prisma.video.update.mockResolvedValue(makeVideo({ isPublished: true }));

      await service.togglePublish('video-id');

      const data = prisma.video.update.mock.calls[0][0].data as any;
      expect(data.isPublished).toBe(true);
    });
  });

  // ============================================
  // syncWithCloudflare
  // ============================================
  describe('syncWithCloudflare', () => {
    it('rejects when video has no cloudflareId', async () => {
      prisma.video.findUnique.mockResolvedValue(
        makeVideo({ cloudflareId: null }),
      );
      await expect(service.syncWithCloudflare('video-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('updates DB fields from Cloudflare details on success (READY)', async () => {
      // duration > 0 so findOne() does NOT trigger its own auto-sync,
      // keeping the assertion focused on syncWithCloudflare's update.
      prisma.video.findUnique.mockResolvedValue(
        makeVideo({ cloudflareId: 'cf-1', duration: 60 }),
      );
      cloudflareStream.getVideoDetails.mockResolvedValue({
        duration: 120,
        thumbnailUrl: 'https://cf/thumb.jpg',
        playbackUrl: 'https://cf/video.m3u8',
        readyToStream: true,
      } as any);
      prisma.video.update.mockResolvedValue(makeVideo({ uploadStatus: 'READY' }));

      await service.syncWithCloudflare('video-id');

      const data = prisma.video.update.mock.calls[0][0].data as any;
      expect(data.duration).toBe(120);
      expect(data.uploadStatus).toBe('READY');
    });

    it('writes uploadStatus=PROCESSING when cloudflare says not ready', async () => {
      prisma.video.findUnique.mockResolvedValue(
        makeVideo({ cloudflareId: 'cf-1', duration: 60 }),
      );
      cloudflareStream.getVideoDetails.mockResolvedValue({
        duration: 0,
        thumbnailUrl: null,
        playbackUrl: null,
        readyToStream: false,
      } as any);
      prisma.video.update.mockResolvedValue(makeVideo());

      await service.syncWithCloudflare('video-id');

      const data = prisma.video.update.mock.calls[0][0].data as any;
      expect(data.uploadStatus).toBe('PROCESSING');
    });

    it('wraps upstream errors as BadRequestException', async () => {
      prisma.video.findUnique.mockResolvedValue(
        makeVideo({ cloudflareId: 'cf-1', duration: 60 }),
      );
      cloudflareStream.getVideoDetails.mockRejectedValue(new Error('5xx'));

      await expect(service.syncWithCloudflare('video-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================
  // moveToModule
  // ============================================
  describe('moveToModule', () => {
    it('returns the video untouched when target = current module', async () => {
      const video = makeVideo({ moduleId: 'module-a' });
      prisma.video.findUnique.mockResolvedValue(video);
      prisma.module.findUnique.mockResolvedValue({ id: 'module-a' } as any);

      const out = await service.moveToModule('video-id', 'module-a');

      expect(prisma.video.update).not.toHaveBeenCalled();
      expect(out).toEqual(video);
    });

    it('throws NotFound when target module missing', async () => {
      prisma.video.findUnique.mockResolvedValue(
        makeVideo({ moduleId: 'module-a' }),
      );
      prisma.module.findUnique.mockResolvedValue(null);

      await expect(
        service.moveToModule('video-id', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('appends to the end of the destination module (nextOrder)', async () => {
      prisma.video.findUnique.mockResolvedValue(
        makeVideo({ moduleId: 'module-a' }),
      );
      prisma.module.findUnique.mockResolvedValue({ id: 'module-b' } as any);
      prisma.video.findFirst.mockResolvedValue(makeVideo({ order: 5 }));
      prisma.video.update.mockResolvedValue(
        makeVideo({ moduleId: 'module-b', order: 6 }),
      );

      await service.moveToModule('video-id', 'module-b');

      const data = prisma.video.update.mock.calls[0][0].data as any;
      expect(data.moduleId).toBe('module-b');
      expect(data.order).toBe(6);
    });

    it('starts at order 0 when destination module is empty', async () => {
      prisma.video.findUnique.mockResolvedValue(
        makeVideo({ moduleId: 'module-a' }),
      );
      prisma.module.findUnique.mockResolvedValue({ id: 'module-b' } as any);
      prisma.video.findFirst.mockResolvedValue(null);
      prisma.video.update.mockResolvedValue(makeVideo());

      await service.moveToModule('video-id', 'module-b');

      const data = prisma.video.update.mock.calls[0][0].data as any;
      expect(data.order).toBe(0);
    });
  });

  // ============================================
  // updateDurationFromPlayer / getNextOrder
  // ============================================
  describe('updateDurationFromPlayer', () => {
    it('ignores invalid duration (0 / negative)', async () => {
      await service.updateDurationFromPlayer('v', 0);
      await service.updateDurationFromPlayer('v', -5);
      expect(prisma.video.update).not.toHaveBeenCalled();
    });

    it('only writes when DB duration is currently 0 or null', async () => {
      prisma.video.findUnique.mockResolvedValue(makeVideo({ duration: 0 }));
      prisma.video.update.mockResolvedValue({} as any);

      await service.updateDurationFromPlayer('v', 123.7);

      const data = prisma.video.update.mock.calls[0][0].data as any;
      expect(data.duration).toBe(124);
    });

    it('skips update when duration already set', async () => {
      prisma.video.findUnique.mockResolvedValue(makeVideo({ duration: 42 }));

      await service.updateDurationFromPlayer('v', 99);

      expect(prisma.video.update).not.toHaveBeenCalled();
    });
  });

  describe('getNextOrder', () => {
    it('returns 0 for an empty module', async () => {
      prisma.video.findFirst.mockResolvedValue(null);
      await expect(service.getNextOrder('module-id')).resolves.toBe(0);
    });

    it('returns lastVideo.order + 1', async () => {
      prisma.video.findFirst.mockResolvedValue(makeVideo({ order: 9 }));
      await expect(service.getNextOrder('module-id')).resolves.toBe(10);
    });
  });
});
