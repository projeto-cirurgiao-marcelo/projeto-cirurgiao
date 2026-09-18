import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { LivesSavedService } from './lives-saved.service';
import { MediaUploadUrlDto, StoriesQueryDto, UpdateReportDto } from './dto/lives-saved.dto';

/**
 * Lado do usuário logado: lê o contador/mural/histórias e escreve o próprio
 * relato. Nada aqui é público (decisão de 10/09). Rotas estáticas antes de
 * `:id`, senão o matcher do Nest as trata como id.
 */
@Controller('lives-saved')
@UseGuards(FirebaseAuthGuard)
export class LivesSavedController {
  constructor(private readonly service: LivesSavedService) {}

  @Get('summary')
  summary() {
    return this.service.summary();
  }

  @Get('wall')
  wall(@GetUser('id') userId: string) {
    return this.service.wall(userId);
  }

  @Get('stories')
  stories(@GetUser('id') userId: string, @Query() q: StoriesQueryDto) {
    return this.service.stories(userId, q);
  }

  @Get('stories/:id')
  story(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.service.story(id, userId);
  }

  @Get('mine')
  mine(@GetUser('id') userId: string) {
    return this.service.mine(userId);
  }

  @Post()
  create(@GetUser('id') userId: string) {
    return this.service.createDraft(userId);
  }

  @Patch(':id')
  update(@GetUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateReportDto) {
    return this.service.update(id, userId, dto);
  }

  @Post(':id/submit')
  @Throttle({ medium: { limit: 5, ttl: 60_000 } })
  submit(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.service.submit(id, userId);
  }

  @Delete(':id')
  remove(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.service.remove(id, userId);
  }

  @Post(':id/media/upload-url')
  @Throttle({ medium: { limit: 30, ttl: 60_000 } })
  uploadUrl(@GetUser('id') userId: string, @Param('id') id: string, @Body() dto: MediaUploadUrlDto) {
    return this.service.mediaUploadUrl(id, userId, dto);
  }

  @Post(':id/media/:mediaId/confirm')
  confirm(@GetUser('id') userId: string, @Param('id') id: string, @Param('mediaId') mediaId: string) {
    return this.service.mediaConfirm(id, mediaId, userId);
  }

  @Delete(':id/media/:mediaId')
  removeMedia(@GetUser('id') userId: string, @Param('id') id: string, @Param('mediaId') mediaId: string) {
    return this.service.mediaRemove(id, mediaId, userId);
  }
}
