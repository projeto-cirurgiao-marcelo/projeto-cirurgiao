-- IAP iOS: produto da App Store ligado à vitrine; índice pra revogação por originalTransactionId.
-- Idempotente: foi aplicada à mão em prod em 18/10/2026 (a pasta ficou fora do commit do deploy).
ALTER TABLE "showcases" ADD COLUMN IF NOT EXISTS "appleProductId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "showcases_appleProductId_key" ON "showcases"("appleProductId");
CREATE INDEX IF NOT EXISTS "entitlements_externalOrderId_idx" ON "entitlements"("externalOrderId");
