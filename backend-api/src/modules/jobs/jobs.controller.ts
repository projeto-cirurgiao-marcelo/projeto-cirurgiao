import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JobsService } from './jobs.service';

/**
 * Public status endpoint for async jobs. Authenticated users can query
 * any job they own; admins can also inspect queue counts (dev tool).
 *
 * Contract documented in docs/API-CHANGES-SPRINT.md — A and B poll this
 * after receiving a 202 from the AI endpoints.
 */
@Controller('jobs')
@UseGuards(FirebaseAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('counts')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getCounts() {
    return this.jobsService.getCounts();
  }

  @Get(':id')
  getStatus(@Param('id') id: string) {
    return this.jobsService.getStatus(id);
  }
}
