/*
  Warnings:

  - You are about to drop the `progress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "progress" DROP CONSTRAINT "progress_courseId_fkey";

-- DropForeignKey
ALTER TABLE "progress" DROP CONSTRAINT "progress_userId_fkey";

-- DropForeignKey
ALTER TABLE "progress" DROP CONSTRAINT "progress_videoId_fkey";

-- DropTable
DROP TABLE "progress";

-- CreateTable
CREATE TABLE "video_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "watchedAt" TIMESTAMP(3),
    "watchTime" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_progress_userId_idx" ON "video_progress"("userId");

-- CreateIndex
CREATE INDEX "video_progress_videoId_idx" ON "video_progress"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "video_progress_userId_videoId_key" ON "video_progress"("userId", "videoId");

-- AddForeignKey
ALTER TABLE "video_progress" ADD CONSTRAINT "video_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_progress" ADD CONSTRAINT "video_progress_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
