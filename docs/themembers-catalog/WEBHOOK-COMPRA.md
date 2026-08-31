# Webhook de compra TheMembers → Entitlement

Implementado em 31/08/2026. Concede/revoga acesso a vitrines automaticamente a cada compra.
Código: `backend-api/src/modules/webhooks/`. Design de origem: `docs/plans/2026-08-12-vitrines-controle-acesso-design.md` §5.

## Contrato (confirmado na doc oficial `documentation.themembers.dev.br/webhooks`)

- **Rota:** `POST /api/v1/webhooks/themembers` — pública (fora do FirebaseAuthGuard).
- **Auth:** header `X-Signature` = HMAC-SHA256 do **corpo cru** com o `security_token` do webhook
  (env `THEMEMBERS_WEBHOOK_SECRET`), comparação timing-safe. Inválido → **403**.
  Exige corpo cru: `express.raw` registrado só para este path em `main.ts` (antes do json parser).
- **Estrutura do payload:** `{ company, payload: { id, object, event, data } }`.
  - `payload.event`: `release.access` (concede) / `revoke.access` (revoga) — só esses dois são consumidos.
  - Idempotência: `externalId = "${event}:${payload.id}"` gravado em `webhook_events` (unique).
    ⚠️ Combina event+id de propósito: `payload.id == order.id`, então release e revoke do mesmo
    pedido colidiriam se a chave fosse só o id.
  - `payload.data.product.id` (key numérica) → `Showcase.externalProductId`.
  - `payload.data.customer.email` → User (cria se não existir).
  - `payload.data.product.expires_in` ('YYYY-MM-DD HH:mm:ss' ou null=vitalício) → `Entitlement.expiresAt`.
  - `payload.data.order.id` → `Entitlement.externalOrderId`.

## Comportamento

- `release.access`: acha vitrine por `externalProductId`; acha/cria User por email; **upsert**
  Entitlement (source=PURCHASE), limpando `revokedAt`/`revokedReason` (recompra reaproveita a linha).
- `revoke.access`: seta `revokedAt`/`revokedReason` (reembolso/chargeback/cancelamento).
- Usuário novo: cria no Postgres + `firebaseAdmin.createUser()` + grava `firebaseUid` +
  `sendPasswordResetEmail()` (o comprador define a senha). Falha no e-mail não invalida a compra.
- **Sempre responde 200** (exceto 403 de assinatura): produto não mapeado / erro → grava
  `WebhookEvent.error` e `processedAt=null` (fila de reprocesso), responde 200. O TheMembers só
  reenvia 3× e desiste — devolver erro faria a compra evaporar.

## Testado (E2E local, 31/08/2026)

Assinatura inválida→403; release.access→200+Entitlement; reenvio→200 deduped;
produto não mapeado→200+error registrado; revoke.access→200+revokedAt. Todos ✅.

## Status de ativação em PRODUÇÃO (31/08/2026) — ATIVO ✅

1. ✅ **Secret** `THEMEMBERS_WEBHOOK_SECRET` no Secret Manager (v2 = token do webhook TheMembers),
   acesso à SA `81746498042-compute@...`, montado no Cloud Run.
2. ✅ **`FIREBASE_API_KEY`** adicionado ao env do Cloud Run.
3. ✅ **Deploy** — revisão `projeto-cirurgiao-api-00110-g4m`. Código mergeado na `main` via PR #67 (rebase).
4. ✅ **Webhook configurado no TheMembers**: "Plataforma Projeto Cirurgião" (id `7500243567910440960`),
   URL de prod, eventos `release.access` + `revoke.access`, ativo. O `security_token` gerado pelo
   TheMembers foi sincronizado com o secret do backend.
   (Coexiste com os 4 webhooks de n8n/Cademi — não os substitui.)

**Teste E2E em produção:** release.access → Entitlement criado; revoke.access → revogado. ✅

## Pendências restantes

- **Completar `externalProductId`** das vitrines sem vínculo (ex.: "Como se tornar um cirurgião
  volante" — produto sem vendas, sem key numérica ainda). Compra desses cai na fila de erro
  (`WebhookEvent.error`, `processedAt=null`) até o vínculo existir. Ver `MIGRACAO-VITRINES.md`.
- **Fila de reprocesso no admin** (Gap: eventos com `error` não têm UI de reprocessamento ainda).
