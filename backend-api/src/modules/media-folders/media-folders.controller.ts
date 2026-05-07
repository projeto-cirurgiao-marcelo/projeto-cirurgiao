import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { MediaFoldersService } from './media-folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { BulkMoveDto } from './dto/bulk-move.dto';

/**
 * Admin Media Library: organizacao logica em arvore. Toda chamada exige
 * ADMIN. Endpoint de reconcile (que escaneia R2 via Worker /index pra
 * popular Videos novos como unassigned) sera adicionado no chunk C.
 */
@Controller('admin/media')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class MediaFoldersController {
  constructor(private readonly service: MediaFoldersService) {}

  @Get('folders')
  listFolders() {
    return this.service.listTree();
  }

  @Post('folders')
  createFolder(@Body() dto: CreateFolderDto) {
    return this.service.create(dto);
  }

  @Patch('folders/:id')
  updateFolder(@Param('id') id: string, @Body() dto: UpdateFolderDto) {
    return this.service.update(id, dto);
  }

  @Delete('folders/:id')
  deleteFolder(@Param('id') id: string) {
    return this.service.remove(id);
  }

  /** Move um unico video pra outra pasta (ou unassigned se folderId vazio). */
  @Patch('videos/:id/folder')
  moveVideo(
    @Param('id') id: string,
    @Body() body: { folderId?: string | null },
  ) {
    return this.service.moveVideo(id, body?.folderId ?? null);
  }

  @Post('videos/bulk-move')
  bulkMove(@Body() dto: BulkMoveDto) {
    return this.service.bulkMove(dto);
  }

  @Get('unassigned')
  unassigned() {
    return this.service.listUnassigned();
  }

  @Get('folders/:id/videos')
  videosInFolder(@Param('id') id: string) {
    return this.service.listVideosInFolder(id);
  }

  /**
   * Sincronizar com R2: diff entre o KV folder index do Worker r2-browser e
   * os Videos r2_hls cadastrados. Retorna pastas com playlist que ainda nao
   * tem Video record. Admin usa esta lista no /admin/media para criar
   * Videos via flow existente do AdicionarVideo (R2 HLS).
   */
  @Get('sync-status')
  syncStatus(@Headers('authorization') auth?: string) {
    return this.service.getSyncStatus(auth);
  }
}
