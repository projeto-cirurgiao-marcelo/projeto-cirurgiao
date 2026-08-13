-- Identidade canônica no Firebase Auth (pré-requisito do gate de vitrines).
-- Nullable de propósito: os Users existentes só ganham o valor pelo backfill
-- (scripts/backfill-firebase-uid.ts), que roda ANTES do guard passar a
-- resolver por UID. O índice unique é o que impede dois Users disputarem a
-- mesma conta Firebase.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "firebaseUid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_firebaseUid_key" ON "users"("firebaseUid");
