-- Sprint 0 / Task 2: add QuestionBankItem model.
--
-- Introduces the curated question pool table referenced by the gamified
-- quiz flow. Each question belongs to one Specialty (cascade delete: if a
-- specialty is removed its questions go with it) and is authored by one
-- User (restrict delete: never silently lose curated content when a user
-- account is removed). `options` is JSONB so we can store an arbitrary
-- N-choice array; `correctAnswer` is the index into that array. The
-- composite index on (specialtyId, active) supports the common lookup
-- "active questions for specialty X" used by attempt generation.
--
-- IMPORTANT: as with every migration that follows the pgvector one,
-- `prisma migrate diff` emits spurious `DROP INDEX` statements for the
-- two HNSW indexes created by 20260418021654_add_pgvector_embeddings
-- (schema.prisma can't represent indexes on Unsupported columns). Those
-- drops have been stripped from this file by hand.

-- CreateTable
CREATE TABLE "question_bank_items" (
    "id" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_bank_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_bank_items_specialtyId_active_idx" ON "question_bank_items"("specialtyId", "active");

-- AddForeignKey
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
