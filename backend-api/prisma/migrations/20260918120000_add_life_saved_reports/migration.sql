-- Contador de vidas salvas (design 2026-09-10): relatos moderados de
-- veterinários + mídia no R2. Só tabelas/colunas novas.

-- CreateEnum
CREATE TYPE "LifeSavedReportStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "LifeSavedReportSource" AS ENUM ('SELF', 'ADMIN_BACKFILL');
CREATE TYPE "AnimalSpecies" AS ENUM ('CANINE', 'FELINE', 'EQUINE', 'BOVINE', 'WILD', 'OTHER');
CREATE TYPE "LifeSavedImpact" AS ENUM ('DIRECT', 'INDIRECT');
CREATE TYPE "LifeSavedMediaKind" AS ENUM ('PHOTO', 'VIDEO');
CREATE TYPE "LifeSavedMediaStatus" AS ENUM ('UPLOADING', 'READY');

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN "crmv" TEXT;

-- CreateTable
CREATE TABLE "life_saved_reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "status" "LifeSavedReportStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "LifeSavedReportSource" NOT NULL DEFAULT 'SELF',
    "reporterName" TEXT NOT NULL,
    "reporterCrmv" TEXT,
    "reporterTitle" TEXT,
    "onBehalfOfName" TEXT,
    "attribution" TEXT NOT NULL DEFAULT '',
    "species" "AnimalSpecies",
    "speciesOther" TEXT,
    "animalName" TEXT,
    "occurredAt" DATE,
    "procedureSummary" TEXT,
    "impactType" "LifeSavedImpact",
    "relatedCourseId" TEXT,
    "consentPublicStory" BOOLEAN NOT NULL DEFAULT false,
    "consentShowName" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "life_saved_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "life_saved_report_media" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "kind" "LifeSavedMediaKind" NOT NULL,
    "r2Key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "LifeSavedMediaStatus" NOT NULL DEFAULT 'UPLOADING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "life_saved_report_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "life_saved_reports_status_createdAt_idx" ON "life_saved_reports"("status", "createdAt");
CREATE INDEX "life_saved_reports_reporterId_createdAt_idx" ON "life_saved_reports"("reporterId", "createdAt");
CREATE INDEX "life_saved_reports_deletedAt_idx" ON "life_saved_reports"("deletedAt");
CREATE INDEX "life_saved_report_media_reportId_order_idx" ON "life_saved_report_media"("reportId", "order");

-- AddForeignKey
ALTER TABLE "life_saved_reports" ADD CONSTRAINT "life_saved_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "life_saved_reports" ADD CONSTRAINT "life_saved_reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "life_saved_reports" ADD CONSTRAINT "life_saved_reports_relatedCourseId_fkey" FOREIGN KEY ("relatedCourseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "life_saved_report_media" ADD CONSTRAINT "life_saved_report_media_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "life_saved_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
