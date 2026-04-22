-- Criar tabela video_summaries manualmente
CREATE TABLE IF NOT EXISTS "video_summaries" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tokenCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_summaries_pkey" PRIMARY KEY ("id")
);

-- Criar índices
CREATE INDEX IF NOT EXISTS "video_summaries_videoId_idx" ON "video_summaries"("videoId");
CREATE INDEX IF NOT EXISTS "video_summaries_userId_idx" ON "video_summaries"("userId");

-- Criar constraint única
CREATE UNIQUE INDEX IF NOT EXISTS "video_summaries_videoId_userId_version_key" ON "video_summaries"("videoId", "userId", "version");

-- Adicionar foreign keys
ALTER TABLE "video_summaries" ADD CONSTRAINT "video_summaries_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "video_summaries" ADD CONSTRAINT "video_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;