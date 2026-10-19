import { Module, Global } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.service';
import { DevicesService } from './devices.service';

@Global()
@Module({
  providers: [FirebaseAdminService, DevicesService],
  exports: [FirebaseAdminService, DevicesService],
})
export class FirebaseModule {}
