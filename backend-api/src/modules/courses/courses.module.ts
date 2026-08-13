import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { CloudflareModule } from '../cloudflare/cloudflare.module';
import { ShowcasesModule } from '../showcases/showcases.module';

@Module({
  imports: [PrismaModule, CloudflareModule, ShowcasesModule],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
