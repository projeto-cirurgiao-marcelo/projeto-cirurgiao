-- AddModuleThumbnails
-- Adicionar campos de thumbnail ao modelo Module

-- Adicionar colunas de thumbnail
ALTER TABLE "modules" ADD COLUMN "thumbnail" TEXT;
ALTER TABLE "modules" ADD COLUMN "thumbnailVertical" TEXT;
ALTER TABLE "modules" ADD COLUMN "thumbnailHorizontal" TEXT;