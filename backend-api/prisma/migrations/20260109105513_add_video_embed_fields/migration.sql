-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "videoSource" TEXT NOT NULL DEFAULT 'cloudflare';
