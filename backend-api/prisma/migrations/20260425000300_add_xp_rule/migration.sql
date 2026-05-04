-- Sprint 0 / Task 4: add XpRule model.
--
-- Standalone configuration table that holds the DB-driven XP formula
-- pieces consumed by the gamification engine. `key` is the stable lookup
-- handle (e.g. "base", "combo", "confidence", "aggregate") and is unique
-- so the engine can fetch a rule by name without ambiguity. `baseXp` is
-- the flat XP component when the rule applies; `multiplierJson` carries
-- the rest of the structured fórmula payload (curves, thresholds, weights)
-- as JSONB so we can iterate on the math without schema churn. `active`
-- lets us soft-disable a rule without deleting history; `createdAt` /
-- `updatedAt` are the standard audit columns. No foreign keys / no reverse
-- relations on purpose — XpRule is reference data, not user data, and
-- will be seeded in Task 11.
--
-- IMPORTANT: as with every migration that follows the pgvector one,
-- `prisma migrate diff` emits spurious `DROP INDEX` statements for the
-- two HNSW indexes created by 20260418021654_add_pgvector_embeddings
-- (schema.prisma can't represent indexes on Unsupported columns). Those
-- drops have been stripped from this file by hand.

-- CreateTable
CREATE TABLE "xp_rules" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "baseXp" INTEGER NOT NULL DEFAULT 0,
    "multiplierJson" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xp_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "xp_rules_key_key" ON "xp_rules"("key");
