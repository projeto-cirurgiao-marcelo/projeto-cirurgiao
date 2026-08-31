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

## Pendências para ativar em PRODUÇÃO

1. **Secret:** gerar um `security_token` forte, gravar em Secret Manager como `THEMEMBERS_WEBHOOK_SECRET`
   e referenciar no Cloud Run. (Local: já há um valor de teste no `.env`.)
2. **`FIREBASE_API_KEY`** no ambiente do backend — necessário para `sendPasswordResetEmail`
   (hoje AUSENTE no `.env`; é a mesma web key do frontend, `NEXT_PUBLIC_FIREBASE_API_KEY`).
3. **Deploy** do backend (a mudança de `rawBody`/middleware está em `main.ts`).
4. **Configurar o webhook no TheMembers:** Checkout › Ferramentas › Webhooks › +Novo Webhook →
   URL `https://projeto-cirurgiao-api-81746498042.southamerica-east1.run.app/api/v1/webhooks/themembers`,
   eventos `release.access` + `revoke.access`, `security_token` = o secret do passo 1, todos os produtos.
   (Já existem 4 webhooks apontando para n8n/Cademi — este é adicional, não os substitui.)
5. **Completar `externalProductId`** das vitrines que ainda estão sem (ex.: "Como se tornar um
   cirurgião volante") — senão a compra desses produtos cai na fila de erro. Ver `MIGRACAO-VITRINES.md`.
