-- AlterTable: novo campo position pra ordenacao manual via admin drag-drop
ALTER TABLE "courses" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "courses_position_createdAt_idx" ON "courses"("position", "createdAt");

-- Seed inicial: cursos existentes recebem position incremental baseado em
-- createdAt DESC (mais recente vira position=1). Garante posicoes unicas
-- desde o inicio — admin pode reordenar a partir dai.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" DESC) AS rn
  FROM courses
  WHERE "deletedAt" IS NULL
)
UPDATE courses c SET "position" = ranked.rn
FROM ranked
WHERE c.id = ranked.id;
