import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { XpService } from './xp.service';
import { BadgesService } from './badges.service';
import { StreakService } from './streak.service';
import { ChallengesService } from './challenges.service';
import { XpCalculatorService } from './xp-calculator.service';

@Module({
  imports: [PrismaModule, FirebaseModule],
  controllers: [GamificationController],
  providers: [
    GamificationService,
    XpService,
    BadgesService,
    StreakService,
    ChallengesService,
    XpCalculatorService,
  ],
  exports: [GamificationService, XpService, XpCalculatorService],
})
export class GamificationModule {}
