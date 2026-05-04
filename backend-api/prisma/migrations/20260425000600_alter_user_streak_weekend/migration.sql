-- Sprint 0 / Task 7: Add weekendFreezeEnabled flag to UserStreak
-- Default true so existing rows opt-in to weekend protection automatically.

-- AlterTable
ALTER TABLE "user_streaks" ADD COLUMN     "weekendFreezeEnabled" BOOLEAN NOT NULL DEFAULT true;
