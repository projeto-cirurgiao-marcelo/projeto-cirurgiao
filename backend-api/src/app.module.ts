import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
// TranscriptsModule removido - VTT do R2 e a fonte de texto via VttTextService
import { ForumCategoriesModule } from './modules/forum-categories/forum-categories.module';
import { ForumModule } from './modules/forum/forum.module';
import { CaptionsModule } from './modules/captions/captions.module';
import { AiSummariesModule } from './modules/ai-summaries/ai-summaries.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { ProfileModule } from './modules/profile/profile.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { AiLibraryModule } from './modules/ai-library/ai-library.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 segundo
        limit: 20,   // máx 20 requests/segundo por IP
      },
      {
        name: 'medium',
        ttl: 60000,  // 1 minuto
        limit: 100,  // máx 100 requests/minuto por IP
      },
    ]),
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
