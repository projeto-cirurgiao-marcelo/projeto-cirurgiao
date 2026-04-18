-- AlterTable: Add readAt column to gamification_events
ALTER TABLE "gamification_events" ADD COLUMN "readAt" TIMESTAMP(3);

-- CreateIndex: Add index for notification history queries
CREATE INDEX "gamification_events_userId_readAt_createdAt_idx" ON "gamification_events"("userId", "readAt", "createdAt");
