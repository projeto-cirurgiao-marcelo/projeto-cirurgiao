-- Sprint 0 Foundation - Task 9
-- Add nullable multiplierBreakdown JSON column to xp_logs to record XP formula breakdown per row.
-- Sprint 1+ will populate {base, combo, confidence, formula} per XP log row when the new XP formula goes live.

-- AlterTable
ALTER TABLE "xp_logs" ADD COLUMN     "multiplierBreakdown" JSONB;
