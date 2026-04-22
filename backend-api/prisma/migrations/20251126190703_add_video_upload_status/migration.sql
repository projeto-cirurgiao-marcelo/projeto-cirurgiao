-- CreateEnum
CREATE TYPE "VideoUploadStatus" AS ENUM ('PENDING', 'UPLOADING', 'PROCESSING', 'READY', 'ERROR');

-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "tempFilePath" TEXT,
ADD COLUMN     "uploadError" TEXT,
ADD COLUMN     "uploadProgress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uploadStatus" "VideoUploadStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "cloudflareId" DROP NOT NULL;
