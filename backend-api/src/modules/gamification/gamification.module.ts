import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { XpService } from './xp.service';
import { BadgesService } from './badges.service';
import { StreakService } from './streak.service';
import { ChallengesService } from './challenges.service';

@Module({
  imports: [PrismaModule, FirebaseModule],
  controllers: [GamificationController],
  providers: [
    GamificationService,
    XpService,
    BadgesService,
    StreakService,
    ChallengesService,
  ],
  exports: [GamificationService, XpService],
})
export class GamificationModule {}
