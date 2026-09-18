import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { LivesSavedService } from './lives-saved.service';
import { AdminCreateReportDto, AdminListQueryDto, RejectReportDto } from './dto/lives-saved.dto';

/** Moderação: só ADMIN aprova, rejeita, remove mídia e faz backfill histórico. */
@Controller('admin/lives-saved')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminLivesSavedController {
  constructor(private readonly service: LivesSavedService) {}

  @Get('stats')
  stats() {
    return this.service.adminStats();
  }

  @Get()
  list(@Query() q: AdminListQueryDto) {
    return this.service.adminList(q);
  }

  @Post()
  create(@GetUser('id') adminId: string, @Body() dto: AdminCreateReportDto) {
    return this.service.adminCreate(adminId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.adminFindOne(id);
  }

  @Post(':id/approve')
  approve(@GetUser('id') adminId: string, @Param('id') id: string) {
    return this.service.approve(id, adminId);
  }

  @Post(':id/reject')
  reject(@GetUser('id') adminId: string, @Param('id') id: string, @Body() dto: RejectReportDto) {
    return this.service.reject(id, adminId, dto.reason);
  }

  @Delete(':id/media/:mediaId')
  removeMedia(@GetUser('id') adminId: string, @Param('id') id: string, @Param('mediaId') mediaId: string) {
    return this.service.mediaRemove(id, mediaId, adminId, true);
  }
}
