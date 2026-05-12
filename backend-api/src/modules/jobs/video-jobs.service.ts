import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { VideoProcessedDto } from './dto/video-processed.dto';

/**
 * Persistence layer for the Cloud Run video pipeline status. Webhook from
 * the Cloud Run worker upserts a row by sourceKey; admins read the recent
 * jobs from the dashboard.
 */
@Injectable()
export class VideoJobsService {
  private readonly logger = new Logger(VideoJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(payload: VideoProcessedDto) {
    const isTerminal =
      payload.status === 'completed' || payload.status === 'failed';
    const now = new Date();

    return this.prisma.videoProcessingJob.upsert({
      where: { sourceKey: payload.sourceKey },
      update: {
        status: payload.status,
        destinationKey: payload.destinationKey,
        profiles: payload.profiles ?? [],
        durationSec: payload.durationSec,
        filesUploaded: payload.filesUploaded,
        errorMessage:
          payload.status === 'failed' ? (payload.error ?? null) : null,
        completedAt: isTerminal ? now : null,
        startedAt:
          payload.status === 'processing' ? now : undefined,
      },
      create: {
        sourceKey: payload.sourceKey,
        destinationKey: payload.destinationKey,
        status: payload.status,
        profiles: payload.profiles ?? [],
        durationSec: payload.durationSec,
        filesUploaded: payload.filesUploaded,
        errorMessage:
          payload.status === 'failed' ? (payload.error ?? null) : null,
        startedAt: payload.status === 'processing' ? now : null,
        completedAt: isTerminal ? now : null,
      },
    });
  }

  async listRecent(limit = 50) {
    return this.prisma.videoProcessingJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  async deleteOne(id: string) {
    const existing = await this.prisma.videoProcessingJob.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`VideoProcessingJob ${id} não encontrado`);
    }
    await this.prisma.videoProcessingJob.delete({ where: { id } });
    return { id, deleted: true };
  }

  async deleteFailed() {
    const result = await this.prisma.videoProcessingJob.deleteMany({
      where: { status: 'failed' },
    });
    return { deleted: result.count };
  }
}
