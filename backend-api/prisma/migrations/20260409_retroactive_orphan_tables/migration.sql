-- Retroactive migration — tables that existed in prod but never had a
-- `prisma migrate` file shipped.
--
-- Discovered during checkpoint 30% reconciliation: the previous
-- `prisma db push` runs (hlsUrl incident was only the tip of the iceberg)
-- also introduced these objects directly:
--   tables: user_profiles, forum_reports, quizzes, quiz_questions,
--           quiz_attempts, quiz_answers
--   enums:  ReportReason, ReportStatus, QuizDifficulty
--   column-level drift: chat_conversations.updatedAt DEFAULT dropped,
--           courses.description should be NULLable per schema.prisma.
--
-- This migration creates/aligns every object so a fresh dev DB matches
-- prod, using IF NOT EXISTS / DO blocks for idempotency. Prod has this
-- migration marked as `applied` via `prisma migrate resolve --applied`
-- (without running it), because prod already contains every object.

-- ============================================
-- ENUMS
-- ============================================
DO $$ BEGIN
    CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'INAPPROPRIATE', 'OFFENSIVE', 'OFF_TOPIC', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "QuizDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- TABLE: user_profiles
-- ============================================
CREATE TABLE IF NOT EXISTS "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "photoUrl" TEXT,
    "profession" TEXT,
    "specializations" TEXT[],
    "state" TEXT,
    "city" TEXT,
    "bio" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_userId_key" ON "user_profiles"("userId");
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_userId_fkey') THEN
        ALTER TABLE "user_profiles"
            ADD CONSTRAINT "user_profiles_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- TABLE: forum_reports
-- ============================================
CREATE TABLE IF NOT EXISTS "forum_reports" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "forum_reports_topicId_idx" ON "forum_reports"("topicId");
CREATE INDEX IF NOT EXISTS "forum_reports_reporterId_idx" ON "forum_reports"("reporterId");
CREATE INDEX IF NOT EXISTS "forum_reports_status_idx" ON "forum_reports"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "forum_reports_topicId_reporterId_key" ON "forum_reports"("topicId", "reporterId");
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_reports_topicId_fkey') THEN
        ALTER TABLE "forum_reports"
            ADD CONSTRAINT "forum_reports_topicId_fkey"
            FOREIGN KEY ("topicId") REFERENCES "forum_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_reports_reporterId_fkey') THEN
        ALTER TABLE "forum_reports"
            ADD CONSTRAINT "forum_reports_reporterId_fkey"
            FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- TABLE: quizzes
-- ============================================
CREATE TABLE IF NOT EXISTS "quizzes" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" "QuizDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "timeLimit" INTEGER,
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "quizzes_videoId_idx" ON "quizzes"("videoId");
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quizzes_videoId_fkey') THEN
        ALTER TABLE "quizzes"
            ADD CONSTRAINT "quizzes_videoId_fkey"
            FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- TABLE: quiz_questions
-- ============================================
CREATE TABLE IF NOT EXISTS "quiz_questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" INTEGER NOT NULL,
    "explanation" TEXT,
    "order" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "quiz_questions_quizId_idx" ON "quiz_questions"("quizId");
CREATE UNIQUE INDEX IF NOT EXISTS "quiz_questions_quizId_order_key" ON "quiz_questions"("quizId", "order");
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_questions_quizId_fkey') THEN
        ALTER TABLE "quiz_questions"
            ADD CONSTRAINT "quiz_questions_quizId_fkey"
            FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- TABLE: quiz_attempts
-- ============================================
CREATE TABLE IF NOT EXISTS "quiz_attempts" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "timeSpent" INTEGER,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "quiz_attempts_quizId_idx" ON "quiz_attempts"("quizId");
CREATE INDEX IF NOT EXISTS "quiz_attempts_userId_idx" ON "quiz_attempts"("userId");
CREATE INDEX IF NOT EXISTS "quiz_attempts_completedAt_idx" ON "quiz_attempts"("completedAt");
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_attempts_quizId_fkey') THEN
        ALTER TABLE "quiz_attempts"
            ADD CONSTRAINT "quiz_attempts_quizId_fkey"
            FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_attempts_userId_fkey') THEN
        ALTER TABLE "quiz_attempts"
            ADD CONSTRAINT "quiz_attempts_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- TABLE: quiz_answers
-- ============================================
CREATE TABLE IF NOT EXISTS "quiz_answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "timeSpent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "quiz_answers_attemptId_idx" ON "quiz_answers"("attemptId");
CREATE INDEX IF NOT EXISTS "quiz_answers_questionId_idx" ON "quiz_answers"("questionId");
CREATE UNIQUE INDEX IF NOT EXISTS "quiz_answers_attemptId_questionId_key" ON "quiz_answers"("attemptId", "questionId");
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_answers_attemptId_fkey') THEN
        ALTER TABLE "quiz_answers"
            ADD CONSTRAINT "quiz_answers_attemptId_fkey"
            FOREIGN KEY ("attemptId") REFERENCES "quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_answers_questionId_fkey') THEN
        ALTER TABLE "quiz_answers"
            ADD CONSTRAINT "quiz_answers_questionId_fkey"
            FOREIGN KEY ("questionId") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- Column-level drift alignment
-- ============================================

-- chat_conversations.updatedAt: schema declares no default, prod already
-- lacks a default — no-op on most environments, ALTER is safe to run.
ALTER TABLE "chat_conversations" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- courses.description: schema declares it optional (String?), prod has
-- NOT NULL. Align prod by dropping NOT NULL.
ALTER TABLE "courses" ALTER COLUMN "description" DROP NOT NULL;
