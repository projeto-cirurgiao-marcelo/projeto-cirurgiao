-- AlterTable: Adicionar campos de tradução ao KnowledgeChunk
ALTER TABLE "knowledge_chunks" ADD COLUMN "contentPt" TEXT;
ALTER TABLE "knowledge_chunks" ADD COLUMN "chapterPt" TEXT;
ALTER TABLE "knowledge_chunks" ADD COLUMN "isTranslated" BOOLEAN NOT NULL DEFAULT false;
