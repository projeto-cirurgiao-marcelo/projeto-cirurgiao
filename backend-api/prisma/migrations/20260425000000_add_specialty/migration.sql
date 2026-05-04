-- Sprint 0 / Task 1: add Specialty model.
--
-- Introduces a domain-neutral `Difficulty` enum (EASY | MEDIUM | HARD) and
-- the `specialties` table that will be referenced by upcoming Sprint 0
-- models (QuestionBankItem, UserMastery) and by QuizAttempt in later tasks.
-- This migration is purely additive — it creates one new enum, one new
-- table, and one unique index on `slug`. No relation reverses are wired up
-- yet; those land with the dependent models in subsequent tasks.
--
-- IMPORTANT: as with every migration that follows the pgvector one,
-- `prisma migrate diff` will try to DROP the two HNSW indexes created by
-- 20260418021654_add_pgvector_embeddings (schema.prisma can't represent
-- them because they live on Unsupported columns). Do NOT let that happen
-- — this file intentionally only adds the new enum, table, and unique
-- index, and never touches the pgvector indexes.

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "specialties" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "specialties_slug_key" ON "specialties"("slug");
