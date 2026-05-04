-- Sprint 0 / Task 8: add AudioPref enum + timezone & audioPreference columns to User.
-- Defaults backfill cleanly on existing rows. Spurious pgvector DROP INDEX lines stripped
-- (shadow DB does not preserve hnsw indexes from manual SQL migrations).

-- CreateEnum
CREATE TYPE "AudioPref" AS ENUM ('AUTO', 'ALWAYS', 'NEVER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "audioPreference" "AudioPref" NOT NULL DEFAULT 'AUTO',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';
