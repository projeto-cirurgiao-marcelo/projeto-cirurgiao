import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VttTextService } from './vtt-text.service';

@Module({
  imports: [PrismaModule],
  providers: [VttTextService],
  exports: [VttTextService],
})
export class VttModule {}
