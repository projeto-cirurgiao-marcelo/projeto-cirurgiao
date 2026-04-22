-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "thumbnailVertical" TEXT,
ADD COLUMN     "thumbnailHorizontal" TEXT;

-- Migrar dados existentes do campo thumbnail para thumbnailHorizontal
UPDATE "courses" SET "thumbnailHorizontal" = "thumbnail" WHERE "thumbnail" IS NOT NULL;
