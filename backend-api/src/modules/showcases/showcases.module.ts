import { Module } from '@nestjs/common';
import { ShowcasesController } from './showcases.controller';
import { StudentShowcasesController } from './student-showcases.controller';
import { PublicShowcasesController } from './public-showcases.controller';
import { ShowcasesService } from './showcases.service';
import { AccessService } from './access.service';
import { ApplePurchasesService } from './apple-purchases.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AuditModule } from '../../shared/audit/audit.module';

@Module({
  imports: [FirebaseModule, PrismaModule, AuditModule],
  controllers: [ShowcasesController, StudentShowcasesController, PublicShowcasesController],
  providers: [ShowcasesService, AccessService, ApplePurchasesService],
  exports: [ShowcasesService, AccessService, ApplePurchasesService],
})
export class ShowcasesModule {}
