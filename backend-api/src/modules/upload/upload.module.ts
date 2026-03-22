import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [UploadService, FirebaseAuthGuard, RolesGuard],
  exports: [UploadService],
})
export class UploadModule {}
