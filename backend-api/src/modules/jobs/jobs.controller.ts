import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JobsService } from './jobs.service';
import { VideoJobsService } from './video-jobs.service';
import { VideoProcessedDto } from './dto/video-processed.dto';
import { WebhookSecretGuard } from './guards/webhook-secret.guard';

/**
 * Public status endpoint for async jobs. Authenticated users can query
 * any job they own; admins can also inspect queue counts (dev tool).
 *
 * Contract documented in docs/API-CHANGES-SPRINT.md — A and B poll this
 * after receiving a 202 from the AI endpoints.
 */
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly videoJobs: VideoJobsService,
  ) {}

  @Get('counts')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getCounts() {
    return this.jobsService.getCounts();
  }

  @Get('video-processing')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listVideoJobs(@Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 50;
    return this.videoJobs.listRecent(Number.isFinite(parsed) ? parsed : 50);
  }

  /**
   * Webhook called by the Cloud Run video pipeline when an encode finishes
   * (or fails). Authenticated by shared HMAC secret, NOT by Firebase.
   */
  @Post('video-processed')
  @UseGuards(WebhookSecretGuard)
  @HttpCode(200)
  videoProcessed(@Body() dto: VideoProcessedDto) {
    return this.videoJobs.recordEvent(dto);
  }

  @Get(':id')
  @UseGuards(FirebaseAuthGuard)
  getStatus(@Param('id') id: string) {
    return this.jobsService.getStatus(id);
  }
}
