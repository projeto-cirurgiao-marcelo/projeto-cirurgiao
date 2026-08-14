import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { GamificationModule } from '../gamification/gamification.module';
import { ShowcasesModule } from '../showcases/showcases.module';

@Module({
  imports: [PrismaModule, GamificationModule, ShowcasesModule],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
