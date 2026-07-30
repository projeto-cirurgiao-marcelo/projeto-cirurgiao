-- CreateTable
CREATE TABLE "video_summary_generation_quotas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "generationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_summary_generation_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_summary_generation_quotas_userId_videoId_key" ON "video_summary_generation_quotas"("userId", "videoId");

-- AddForeignKey
ALTER TABLE "video_summary_generation_quotas" ADD CONSTRAINT "video_summary_generation_quotas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_summary_generation_quotas" ADD CONSTRAINT "video_summary_generation_quotas_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: consumo já realizado = maior generationCount vivo por aluno×aula.
-- Quem já deletou todos os resumos de um vídeo não tem linha para reconstruir
-- e entra com quota zerada (limitação histórica aceita — ver plano §6).
INSERT INTO "video_summary_generation_quotas" ("id", "userId", "videoId", "generationCount", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "userId", "videoId", MAX("generationCount"), NOW(), NOW()
FROM "video_summaries"
GROUP BY "userId", "videoId";
