-- Task 9: soft delete + audit log.
--
-- Adds a `deletedAt TIMESTAMP(3) NULL` column to the four core entities
-- that should never be physically deleted in production (losing them
-- cascades into broken enrollments / analytics / progress history):
--   users, courses, modules, videos
--
-- Adds a generic `audit_logs` table that AuditService writes into when
-- destructive or privilege-changing ops happen (soft-deletes, publish
-- toggles, role changes). Intentionally single-table + no enum on
-- `action` to stay flexible; the application layer drives the
-- vocabulary via AuditAction strings.
--
-- IMPORTANT — as with every migration that follows the pgvector one,
-- `prisma migrate diff` will try to DROP the two HNSW indexes created
-- by 20260418021654_add_pgvector_embeddings (schema.prisma can't
-- represent them because they live on Unsupported columns). Do NOT let
-- that happen — this file intentionally only adds new columns / the new
-- table, and never touches the pgvector indexes.

-- 1. Soft-delete columns + indexes.
ALTER TABLE "users"   ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "videos"  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "users_deletedAt_idx"   ON "users"("deletedAt");
CREATE INDEX IF NOT EXISTS "courses_deletedAt_idx" ON "courses"("deletedAt");
CREATE INDEX IF NOT EXISTS "modules_deletedAt_idx" ON "modules"("deletedAt");
CREATE INDEX IF NOT EXISTS "videos_deletedAt_idx"  ON "videos"("deletedAt");

-- 2. Audit log table.
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_logs_actorId_createdAt_idx"
    ON "audit_logs"("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_entityId_createdAt_idx"
    ON "audit_logs"("entityType", "entityId", "createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_action_createdAt_idx"
    ON "audit_logs"("action", "createdAt");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_actorId_fkey') THEN
        ALTER TABLE "audit_logs"
            ADD CONSTRAINT "audit_logs_actorId_fkey"
            FOREIGN KEY ("actorId") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
