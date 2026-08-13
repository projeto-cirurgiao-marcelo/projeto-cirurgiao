import { Module } from '@nestjs/common';
import { ShowcasesController } from './showcases.controller';
import { ShowcasesService } from './showcases.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AuditModule } from '../../shared/audit/audit.module';

@Module({
  imports: [FirebaseModule, PrismaModule, AuditModule],
  controllers: [ShowcasesController],
  providers: [ShowcasesService],
  exports: [ShowcasesService],
})
export class ShowcasesModule {}
