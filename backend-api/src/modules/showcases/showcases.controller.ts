import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ShowcasesService } from './showcases.service';
import {
  AddModuleVideosDto,
  AddVideosDto,
  CreateShowcaseDto,
  UpdateShowcaseDto,
} from './dto/showcase.dto';

/**
 * Admin de vitrines. Toda chamada exige ADMIN — a composição da vitrine é
 * o que vai governar acesso pago quando o gate (etapa 3) entrar.
 *
 * Rotas estáticas (videos/search, orphan-videos, course-tree) vêm ANTES de
 * :id, senão o matcher do Nest as trata como id.
 */
@Controller('admin/showcases')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ShowcasesController {
  constructor(private readonly service: ShowcasesService) {}

  @Get('videos/search')
  searchVideos(
    @Query('q') q?: string,
    @Query('showcaseId') showcaseId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.searchVideos(q ?? '', showcaseId, limit ? Number(limit) : 50);
  }

  /** Aulas publicadas fora de qualquer vitrine — quem pagou não as vê. */
  @Get('orphan-videos')
  orphanVideos(@Query('courseId') courseId?: string) {
    return this.service.listOrphanVideos(courseId);
  }

  @Get('course-tree')
  courseTree() {
    return this.service.listCourseTree();
  }

  @Get()
  list(@Query('includeArchived') includeArchived?: string) {
    return this.service.list(includeArchived === 'true');
  }

  @Post()
  create(@Body() dto: CreateShowcaseDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateShowcaseDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  archive(@Param('id') id: string, @Req() req: any) {
    return this.service.archive(id, req.user?.userId ?? null);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string, @Req() req: any) {
    return this.service.restore(id, req.user?.userId ?? null);
  }

  @Post(':id/videos')
  addVideos(@Param('id') id: string, @Body() dto: AddVideosDto) {
    return this.service.addVideos(id, dto);
  }

  /** Atalho: materializa uma linha por aula do módulo no clique. */
  @Post(':id/videos/from-module')
  addModuleVideos(@Param('id') id: string, @Body() dto: AddModuleVideosDto) {
    return this.service.addModuleVideos(id, dto);
  }

  @Delete(':id/videos/:videoId')
  removeVideo(@Param('id') id: string, @Param('videoId') videoId: string) {
    return this.service.removeVideo(id, videoId);
  }
}
