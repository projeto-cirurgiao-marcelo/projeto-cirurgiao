-- Sprint 0 / Task 5: add ConfidenceLevel enum + extend QuizAnswer.
--
-- Two non-destructive ADD COLUMN operations on the existing `quiz_answers`
-- table plus a brand-new `ConfidenceLevel` enum. `confidence` captures the
-- learner's self-reported certainty when they answered the question
-- (GUESSED / THOUGHT_KNEW / KNEW / MASTERED) and feeds the XP formula in
-- the gamification engine. `xpAwarded` records how many XP this specific
-- answer ultimately granted, so we can audit the math after the fact and
-- never recompute against drifted XpRule rows. Both columns are nullable
-- with no default on purpose: legacy rows answered before the gamification
-- rollout stay NULL, and old code paths that don't yet write these fields
-- keep working unchanged.
--
-- IMPORTANT: as with every migration that follows the pgvector one,
-- `prisma migrate diff` emits spurious `DROP INDEX` statements for the
-- two HNSW indexes created by 20260418021654_add_pgvector_embeddings
-- (schema.prisma can't represent indexes on Unsupported columns). Those
-- drops have been stripped from this file by hand.

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('GUESSED', 'THOUGHT_KNEW', 'KNEW', 'MASTERED');

-- AlterTable
ALTER TABLE "quiz_answers" ADD COLUMN     "confidence" "ConfidenceLevel",
ADD COLUMN     "xpAwarded" INTEGER;
