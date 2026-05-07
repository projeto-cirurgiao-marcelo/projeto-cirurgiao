import { Module } from '@nestjs/common';
import { MediaFoldersController } from './media-folders.controller';
import { MediaFoldersService } from './media-folders.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [FirebaseModule, PrismaModule],
  controllers: [MediaFoldersController],
  providers: [MediaFoldersService],
  exports: [MediaFoldersService],
})
export class MediaFoldersModule {}
