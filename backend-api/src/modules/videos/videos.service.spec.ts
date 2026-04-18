import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Video } from '@prisma/client';

import { VideosService } from './videos.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CloudflareStreamService } from '../cloudflare/cloudflare-stream.service';
import { CloudflareR2Service } from '../cloudflare/cloudflare-r2.service';
import { VideoSource, VideoUploadStatus } from './dto/create-video.dto';

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

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    cloudflareStream = mockDeep<CloudflareStreamService>();
    cloudflareR2 = mockDeep<CloudflareR2Service>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideosService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudflareStreamService, useValue: cloudflareStream },
        { provide: CloudflareR2Service, useValue: cloudflareR2 },
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

});
