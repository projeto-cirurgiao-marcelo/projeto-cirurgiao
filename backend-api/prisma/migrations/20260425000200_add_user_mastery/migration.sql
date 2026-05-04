-- Sprint 0 / Task 3: add UserMastery model.
--
-- One row per (user, specialty) tracks the learner's mastery score for the
-- gamified quiz flow. `score` is a Float in the 0-100 range (Float so the
-- spaced-repetition decay job can write fractional values without rounding
-- back to integers). `totalAttempts` / `totalCorrect` are running tallies
-- used by the dashboard. `lastReviewAt` is bumped every time the user
-- answers a question for the specialty; `lastDecayAt` is bumped by the
-- decay worker so we know how much time-based decay has already been
-- applied. Both FKs cascade on delete: mastery is dependent data — if the
-- user account or the specialty itself goes away the mastery rows must go
-- with them. Composite unique on (userId, specialtyId) enforces the
-- one-row-per-pair invariant; the per-column btree indexes back the two
-- common lookups (all mastery for a user, all users for a specialty).
--
-- IMPORTANT: as with every migration that follows the pgvector one,
-- `prisma migrate diff` emits spurious `DROP INDEX` statements for the
-- two HNSW indexes created by 20260418021654_add_pgvector_embeddings
-- (schema.prisma can't represent indexes on Unsupported columns). Those
-- drops have been stripped from this file by hand.

-- CreateTable
CREATE TABLE "user_mastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "totalCorrect" INTEGER NOT NULL DEFAULT 0,
    "lastReviewAt" TIMESTAMP(3),
    "lastDecayAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_mastery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_mastery_userId_idx" ON "user_mastery"("userId");

-- CreateIndex
CREATE INDEX "user_mastery_specialtyId_idx" ON "user_mastery"("specialtyId");

-- CreateIndex
CREATE UNIQUE INDEX "user_mastery_userId_specialtyId_key" ON "user_mastery"("userId", "specialtyId");

-- AddForeignKey
ALTER TABLE "user_mastery" ADD CONSTRAINT "user_mastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mastery" ADD CONSTRAINT "user_mastery_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
