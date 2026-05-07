-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "folderId" TEXT,
ADD COLUMN     "r2Basename" TEXT;

-- CreateTable
CREATE TABLE "media_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "courseId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_folders_parentId_position_idx" ON "media_folders"("parentId", "position");

-- CreateIndex
CREATE INDEX "media_folders_courseId_idx" ON "media_folders"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "media_folders_parentId_slug_key" ON "media_folders"("parentId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "videos_r2Basename_key" ON "videos"("r2Basename");

-- CreateIndex
CREATE INDEX "videos_folderId_idx" ON "videos"("folderId");

-- CreateIndex
CREATE INDEX "videos_r2Basename_idx" ON "videos"("r2Basename");

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "media_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "media_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

