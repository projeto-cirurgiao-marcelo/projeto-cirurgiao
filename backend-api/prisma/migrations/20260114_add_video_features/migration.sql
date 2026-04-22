-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('PDF', 'LINK', 'ARTICLE', 'VIDEO', 'IMAGE');

-- CreateTable: video_likes (Sistema de Curtidas)
CREATE TABLE "video_likes" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: video_notes (Sistema de Notas)
CREATE TABLE "video_notes" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: video_transcripts (Sistema de Transcrição)
CREATE TABLE "video_transcripts" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "segments" JSONB NOT NULL,
    "fullText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: video_materials (Material Relacionado)
CREATE TABLE "video_materials" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "MaterialType" NOT NULL DEFAULT 'LINK',
    "url" TEXT NOT NULL,
    "fileSize" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: video_likes
CREATE INDEX "video_likes_videoId_idx" ON "video_likes"("videoId");
CREATE INDEX "video_likes_userId_idx" ON "video_likes"("userId");
CREATE UNIQUE INDEX "video_likes_videoId_userId_key" ON "video_likes"("videoId", "userId");

-- CreateIndex: video_notes
CREATE INDEX "video_notes_videoId_userId_idx" ON "video_notes"("videoId", "userId");
CREATE INDEX "video_notes_videoId_idx" ON "video_notes"("videoId");

-- CreateIndex: video_transcripts
CREATE UNIQUE INDEX "video_transcripts_videoId_key" ON "video_transcripts"("videoId");

-- CreateIndex: video_materials
CREATE INDEX "video_materials_videoId_idx" ON "video_materials"("videoId");

-- AddForeignKey: video_likes
ALTER TABLE "video_likes" ADD CONSTRAINT "video_likes_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "video_likes" ADD CONSTRAINT "video_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: video_notes
ALTER TABLE "video_notes" ADD CONSTRAINT "video_notes_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "video_notes" ADD CONSTRAINT "video_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: video_transcripts
ALTER TABLE "video_transcripts" ADD CONSTRAINT "video_transcripts_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: video_materials
ALTER TABLE "video_materials" ADD CONSTRAINT "video_materials_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
