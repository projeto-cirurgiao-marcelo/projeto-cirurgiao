-- Sprint 0 Task 6: alter QuizAttempt — add comboMax + specialtyId (FK to Specialty, ON DELETE SET NULL)
-- Spurious DROP INDEX lines for pgvector HNSW indexes were stripped (those indexes are managed
-- outside Prisma since `embedding` is JSON in the Prisma schema; the real DB has pgvector indexes
-- that must NOT be dropped).

-- AlterTable
ALTER TABLE "quiz_attempts" ADD COLUMN     "comboMax" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "specialtyId" TEXT;

-- CreateIndex
CREATE INDEX "quiz_attempts_specialtyId_idx" ON "quiz_attempts"("specialtyId");

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
