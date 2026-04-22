-- CreateEnum
CREATE TYPE "ChallengePeriod" AS ENUM ('DAILY', 'WEEKLY', 'SPECIAL');

-- CreateEnum
CREATE TYPE "GamificationChallengeDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "xp_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "description" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeSlug" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_streaks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TEXT,
    "freezesAvailable" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ChallengePeriod" NOT NULL,
    "templateKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "GamificationChallengeDifficulty" NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "icon" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "xp_logs_userId_idx" ON "xp_logs"("userId");

-- CreateIndex
CREATE INDEX "xp_logs_userId_createdAt_idx" ON "xp_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "xp_logs_createdAt_idx" ON "xp_logs"("createdAt");

-- CreateIndex
CREATE INDEX "xp_logs_userId_action_referenceId_idx" ON "xp_logs"("userId", "action", "referenceId");

-- CreateIndex
CREATE INDEX "user_badges_userId_idx" ON "user_badges"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_userId_badgeSlug_key" ON "user_badges"("userId", "badgeSlug");

-- CreateIndex
CREATE UNIQUE INDEX "user_streaks_userId_key" ON "user_streaks"("userId");

-- CreateIndex
CREATE INDEX "gamification_challenges_userId_idx" ON "gamification_challenges"("userId");

-- CreateIndex
CREATE INDEX "gamification_challenges_userId_type_expiresAt_idx" ON "gamification_challenges"("userId", "type", "expiresAt");

-- CreateIndex
CREATE INDEX "gamification_challenges_expiresAt_idx" ON "gamification_challenges"("expiresAt");

-- CreateIndex
CREATE INDEX "gamification_events_userId_seen_createdAt_idx" ON "gamification_events"("userId", "seen", "createdAt");

-- CreateIndex
CREATE INDEX "gamification_events_userId_createdAt_idx" ON "gamification_events"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "xp_logs" ADD CONSTRAINT "xp_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_challenges" ADD CONSTRAINT "gamification_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_events" ADD CONSTRAINT "gamification_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
