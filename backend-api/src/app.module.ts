import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { USER_THROTTLE_TRACKER } from './shared/throttler/user-throttler.guard';
import { UserThrottlerModule } from './shared/throttler/user-throttler.module';
import { QueueModule } from './shared/queue/queue.module';
import { AuditModule } from './shared/audit/audit.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { TokenCleanupService } from './shared/tasks/token-cleanup.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CloudflareModule } from './modules/cloudflare/cloudflare.module';
import { CoursesModule } from './modules/courses/courses.module';
import { ModulesModule } from './modules/modules/modules.module';
import { VideosModule } from './modules/videos/videos.module';
import { ProgressModule } from './modules/progress/progress.module';
import { FirebaseModule } from './modules/firebase/firebase.module';
import { UploadModule } from './modules/upload/upload.module';
import { LikesModule } from './modules/likes/likes.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { NotesModule } from './modules/notes/notes.module';
import { ForumCategoriesModule } from './modules/forum-categories/forum-categories.module';
import { ForumModule } from './modules/forum/forum.module';
import { CaptionsModule } from './modules/captions/captions.module';
import { AiSummariesModule } from './modules/ai-summaries/ai-summaries.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { ProfileModule } from './modules/profile/profile.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { AiLibraryModule } from './modules/ai-library/ai-library.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const aiUserRpm = parseInt(
          configService.get<string>('AI_USER_THROTTLE_RPM') ?? '30',
          10,
        );
        return [
          {
            name: 'short',
            ttl: 1000, // 1 segundo
            limit: 20, // máx 20 requests/segundo por IP
          },
          {
            name: 'medium',
            ttl: 60_000, // 1 minuto
            limit: 100, // máx 100 requests/minuto por IP
          },
          {
            name: USER_THROTTLE_TRACKER, // 'ai-user'
            ttl: 60_000,
            limit: Number.isFinite(aiUserRpm) && aiUserRpm > 0 ? aiUserRpm : 30,
          },
        ];
      },
    }),
    UserThrottlerModule,
    QueueModule.forRoot(),
    AuditModule,
    PrismaModule,
    FirebaseModule, // Firebase Admin SDK
    AuthModule,
    UsersModule,
    CloudflareModule,
    CoursesModule,
    ModulesModule,
    VideosModule,
    ProgressModule,
    UploadModule,
    LikesModule,
    MaterialsModule,
    NotesModule,
    ForumCategoriesModule,
    ForumModule,
    CaptionsModule,
    AiSummariesModule,
    QuizzesModule,
    AiChatModule,
    ProfileModule,
    GamificationModule,
    AiLibraryModule,
    JobsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    TokenCleanupService,
  ],
})
export class AppModule {}
