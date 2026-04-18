import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { AiSummariesModule } from '../ai-summaries/ai-summaries.module';
import { VttModule } from '../../shared/vtt/vtt.module';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';
import { QuizProcessor } from './quiz.processor';
import { QuizGeneratorService } from './quiz-generator.service';
import { QuizAttemptsService } from './quiz-attempts.service';
import { GamificationModule } from '../gamification/gamification.module';
import { UserThrottlerModule } from '../../shared/throttler/user-throttler.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    FirebaseModule,
    AiSummariesModule,
    VttModule,
    GamificationModule,
    UserThrottlerModule,
  ],
  controllers: [QuizzesController],
  providers: [QuizzesService, QuizGeneratorService, QuizAttemptsService, QuizProcessor],
  exports: [QuizzesService, QuizAttemptsService],
})
export class QuizzesModule {}