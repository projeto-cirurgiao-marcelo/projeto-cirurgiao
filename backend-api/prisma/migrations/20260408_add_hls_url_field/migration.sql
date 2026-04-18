-- AlterTable: Adicionar campo hlsUrl ao Video para streaming HLS via R2 CDN
ALTER TABLE "videos" ADD COLUMN "hlsUrl" TEXT;
