import { Module } from '@nestjs/common';
import { CaptionsService } from './captions.service';
import { CaptionsController } from './captions.controller';
import { CaptionsProcessor } from './captions.processor';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { CloudflareModule } from '../cloudflare/cloudflare.module';

@Module({
  imports: [PrismaModule, CloudflareModule],
  controllers: [CaptionsController],
  providers: [CaptionsService, CaptionsProcessor],
  exports: [CaptionsService],
})
export class CaptionsModule {}
