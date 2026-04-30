import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin/dashboard')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  @Get('activity')
  getActivity(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 10;
    return this.service.getActivity(Number.isFinite(parsed) ? parsed : 10);
  }

  @Get('enrollments-chart')
  getEnrollmentsChart(
    @Query('range') range = '6m',
    @Query('granularity') granularity = 'month',
  ) {
    return this.service.getEnrollmentsChart(range, granularity);
  }

  @Get('top-courses')
  getTopCourses(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 5;
    return this.service.getTopCourses(Number.isFinite(parsed) ? parsed : 5);
  }
}
