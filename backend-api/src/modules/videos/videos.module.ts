import { Module } from '@nestjs/common';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { CloudflareModule } from '../cloudflare/cloudflare.module';
import { CoursesModule } from '../courses/courses.module';
import { ModulesModule } from '../modules/modules.module';
import { ShowcasesModule } from '../showcases/showcases.module';

@Module({
  imports: [PrismaModule, CloudflareModule, CoursesModule, ModulesModule, ShowcasesModule],
  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
