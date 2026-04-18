/*
  Warnings:

  - You are about to drop the column `completed` on the `progress` table. All the data in the column will be lost.
  - You are about to drop the column `watchedDuration` on the `progress` table. All the data in the column will be lost.
  - Added the required column `courseId` to the `progress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "progress" DROP COLUMN "completed",
DROP COLUMN "watchedDuration",
ADD COLUMN     "courseId" TEXT NOT NULL,
ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "watchedSeconds" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "progress_courseId_idx" ON "progress"("courseId");

-- CreateIndex
CREATE INDEX "progress_userId_courseId_idx" ON "progress"("userId", "courseId");

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
