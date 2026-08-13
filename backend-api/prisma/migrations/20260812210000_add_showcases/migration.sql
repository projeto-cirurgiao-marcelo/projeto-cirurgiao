-- Vitrines com controle de acesso por compra (design 2026-08-12, §4).
-- Só as tabelas novas: Showcase / ShowcaseVideo / Entitlement / WebhookEvent.
--
-- NOTA: `prisma migrate diff` também sugeriu dropar as FKs
-- `library_conversations_userid_fkey` e `token_usage_daily_userid_fkey`
-- (drift antigo: nome de coluna em lowercase). Foram OMITIDAS de propósito —
-- não são desta feature e dropar FK em produção não pode ser efeito colateral.

-- CreateEnum
CREATE TYPE "EntitlementSource" AS ENUM ('PURCHASE', 'GRANDFATHER', 'COURTESY', 'ADMIN');

-- CreateTable
CREATE TABLE "showcases" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "externalProductId" TEXT,
    "grantsAllContent" BOOLEAN NOT NULL DEFAULT false,
    "previewSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "showcases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcase_videos" (
    "showcaseId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "showcase_videos_pkey" PRIMARY KEY ("showcaseId","videoId")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "source" "EntitlementSource" NOT NULL,
    "externalOrderId" TEXT,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "showcases_slug_key" ON "showcases"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "showcases_externalProductId_key" ON "showcases"("externalProductId");

-- CreateIndex
CREATE INDEX "showcases_deletedAt_idx" ON "showcases"("deletedAt");

-- CreateIndex
CREATE INDEX "showcase_videos_videoId_idx" ON "showcase_videos"("videoId");

-- CreateIndex
CREATE INDEX "entitlements_userId_revokedAt_expiresAt_idx" ON "entitlements"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_userId_showcaseId_key" ON "entitlements"("userId", "showcaseId");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_externalId_key" ON "webhook_events"("externalId");

-- CreateIndex
CREATE INDEX "webhook_events_provider_event_receivedAt_idx" ON "webhook_events"("provider", "event", "receivedAt");

-- AddForeignKey
ALTER TABLE "showcase_videos" ADD CONSTRAINT "showcase_videos_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "showcases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_videos" ADD CONSTRAINT "showcase_videos_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "showcases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
