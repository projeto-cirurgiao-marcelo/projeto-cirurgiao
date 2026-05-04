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

  CREATE UNIQUE INDEX "video_processing_jobs_sourceKey_key" ON "video_processing_jobs"("sourceKey");
  CREATE INDEX "video_processing_jobs_status_createdAt_idx" ON "video_processing_jobs"("status", "createdAt");
  CREATE INDEX "video_processing_jobs_createdAt_idx" ON "video_processing_jobs"("createdAt");