import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

/**
 * Cache fase 2: TTL em memória local (sem Redis ainda).
 * - max=200 keys evita memory leak em Cloud Run com várias instâncias.
 * - TTL maior fica no service por endpoint via Cache.set explicito.
 */
@Module({
  imports: [
    PrismaModule,
    FirebaseModule,
    CacheModule.register({
      ttl: 60_000,
      max: 200,
      isGlobal: false,
    }),
  ],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminDashboardModule {}
