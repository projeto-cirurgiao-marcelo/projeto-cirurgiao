-- AlterTable
ALTER TABLE "forum_topics" ADD COLUMN     "videoThumbnailUrl" TEXT,
ADD COLUMN     "videoTimestamp" INTEGER;

-- CreateTable
CREATE TABLE "video_bookmarks" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "label" TEXT,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_processing_jobs" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "destinationKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "profiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "durationSec" DOUBLE PRECISION,
    "filesUploaded" INTEGER,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_bookmarks_userId_videoId_idx" ON "video_bookmarks"("userId", "videoId");

-- CreateIndex
CREATE INDEX "video_bookmarks_videoId_idx" ON "video_bookmarks"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "video_processing_jobs_sourceKey_key" ON "video_processing_jobs"("sourceKey");

-- CreateIndex
CREATE INDEX "video_processing_jobs_status_createdAt_idx" ON "video_processing_jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "video_processing_jobs_createdAt_idx" ON "video_processing_jobs"("createdAt");

-- AddForeignKey
ALTER TABLE "video_bookmarks" ADD CONSTRAINT "video_bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_bookmarks" ADD CONSTRAINT "video_bookmarks_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

