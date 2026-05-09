-- Substitui @@unique([courseId, order]) e @@unique([moduleId, order]) por
-- partial unique indexes que aplicam apenas a rows ativas (deletedAt IS NULL).
-- Soft-deletes nao retem mais o slot order, eliminando P2002 em reorder.

-- Module.courseId+order
ALTER TABLE "modules" DROP CONSTRAINT IF EXISTS "modules_courseId_order_key";
DROP INDEX IF EXISTS "modules_courseId_order_key";
CREATE UNIQUE INDEX "modules_courseId_order_active_key"
  ON "modules" ("courseId", "order")
  WHERE "deletedAt" IS NULL;
-- Index nao-unique para queries por (courseId, order); o unique acima ja
-- serve, mas Prisma schema declara @@index([courseId, order]) em paralelo
-- pra documentar a intencao em codigo.
CREATE INDEX IF NOT EXISTS "modules_courseId_order_idx"
  ON "modules" ("courseId", "order");

-- Video.moduleId+order
ALTER TABLE "videos" DROP CONSTRAINT IF EXISTS "videos_moduleId_order_key";
DROP INDEX IF EXISTS "videos_moduleId_order_key";
CREATE UNIQUE INDEX "videos_moduleId_order_active_key"
  ON "videos" ("moduleId", "order")
  WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "videos_moduleId_order_idx"
  ON "videos" ("moduleId", "order");
