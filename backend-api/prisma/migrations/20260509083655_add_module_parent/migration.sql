-- Hierarquia de submodulos: 1 nivel (validado em service, nao constraint).
-- Modulo raiz: parentModuleId = NULL, scoped por courseId.
-- Submodulo: parentModuleId = <pai>, scoped por parentModuleId.
-- Cada scope tem seu proprio namespace de "order" via partial unique.

-- AlterTable
ALTER TABLE "modules" ADD COLUMN "parentModuleId" TEXT;

-- CreateIndex (sem unique, pra range queries por hierarquia)
CREATE INDEX "modules_parentModuleId_order_idx" ON "modules"("parentModuleId", "order");

-- AddForeignKey: cascade — deletar pai derruba subtree.
ALTER TABLE "modules"
  ADD CONSTRAINT "modules_parentModuleId_fkey"
  FOREIGN KEY ("parentModuleId") REFERENCES "modules"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop partial unique antigo (courseId, order) que nao distinguia raiz vs filho.
DROP INDEX IF EXISTS "modules_courseId_order_active_key";

-- Recria scoped:
-- 1) Modulos raiz unicos por (courseId, order) — somente parentModuleId IS NULL
CREATE UNIQUE INDEX "modules_courseId_root_order_active_key"
  ON "modules" ("courseId", "order")
  WHERE "deletedAt" IS NULL AND "parentModuleId" IS NULL;

-- 2) Submodulos unicos por (parentModuleId, order)
CREATE UNIQUE INDEX "modules_parentModuleId_order_active_key"
  ON "modules" ("parentModuleId", "order")
  WHERE "deletedAt" IS NULL AND "parentModuleId" IS NOT NULL;
