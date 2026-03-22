import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, FirebaseModule, UploadModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
