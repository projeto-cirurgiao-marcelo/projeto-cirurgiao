# Design — Vitrines com controle de acesso por compra

> **Status:** aprovado em 2026-08-12, não implementado.
> **Próximo passo:** plano de implementação (writing-plans).
> **Pré-requisito bloqueante:** fix do `firebaseUid` (§9) antes da etapa 5.

---

## 1. O problema

O professor vende recortes temáticos do conteúdo — "Castração Descomplicada",
"Cistotomia Descomplicada" — cada um como um produto separado. Quem compra
castração deve ver castração; o resto do catálogo aparece como provocação de
compra, não como conteúdo liberado. Isso escala até a pós-graduação, que dá
acesso à plataforma inteira.

Hoje a plataforma não tem nada disso.

---

## 2. Estado atual verificado (banco de produção, 2026-08-12)

**10 cursos · 154 módulos · 1.394 aulas (1.322 publicadas) · 30 usuários · 59 matrículas**

| Curso | Módulos | Aulas |
|---|---|---|
| Comece Por Aqui | 1 | 1 |
| Posicionamento e Atração | 20 | 70 |
| Treinamentos Premium | 14 | 91 |
| Tecidos Moles | 1 | 236 |
| Ortopedia Na Prática | 1 | 136 |
| Neurocirurgia Na Prática | 1 | 28 |
| Aprofundamento Tecidos Moles | 45 | 315 |
| Aprofundamento Ortopedia | 7 | 48 |
| Treinamentos \| Pós graduação | 46 | 335 |
| Ciclo de Cursos Avançados | 17 | 106 |

**Três fatos que orientaram o design:**

1. **Não existe controle de acesso.** `GET /courses` passa só pelo
   `FirebaseAuthGuard` — qualquer aluno autenticado vê e assiste tudo que está
   publicado. Não estamos estendendo um gate; estamos criando o primeiro.
2. **`Enrollment` não é direito de acesso.** `progress.service.ts:262`
   (`ensureEnrollment`) cria a matrícula **automaticamente** quando o aluno
   progride. É telemetria de "começou a assistir". `Course.price` existe e não
   governa nada (está `0.00` em tudo, `0.03` em Neurocirurgia — resíduo de teste).
3. **As vitrines do legado já estão no banco, como módulos raiz de
   "Treinamentos Premium":** `Castração Descomplicada - Gravado` (20 aulas),
   `Cistotomia Descomplicada` (8), `Uretrostomia Perineal em Felinos
   Descomplicada` (9), `Ruptura Diafragmática Descomplicada` (10),
   `Mastectomia Descomplicada` (10), `Manual de Suturas` (23 em 2 submódulos),
   `Como se tornar um cirurgião volante` (6), entre outros. Esse "curso" é, na
   prática, o catálogo de produtos do professor já importado.

**Por que agrupar por módulo não bastaria:** "castração" está em três lugares —
`Castração Descomplicada - Gravado` e `Castração Descomplicada ao vivo
21/10/2025` (ambos em Treinamentos Premium) e `Castração pelo Flanco`
(Aprofundamento Tecidos Moles). A vitrine real cruza dois cursos.

---

## 3. Decisões

| Tema | Decisão |
|---|---|
| O que é uma vitrine | Coleção curada de vídeos, montada pelo admin |
| Composição | **Lista explícita** de vídeos, com atalho de UI "adicionar módulo inteiro" |
| Navegação do aluno | Continua por curso. A vitrine é camada de permissão, não de navegação |
| Conteúdo não comprado | Visível, com **preview de 2 minutos** |
| Alcance do preview | Catálogo inteiro, como no legado |
| Nível de proteção | **1 — corte no player.** Risco aceito, ver §11 |
| Usuários existentes | **Grandfather** — os 30 mantêm acesso total |
| Comprador sem conta | Conta criada automaticamente + e-mail de definição de senha |
| Gateway | **TheMembers**, só como checkout (conteúdo fica na nossa plataforma) |
| Validade | Por produto: vitrine avulsa vitalícia, pós-graduação recorrente |

**Abordagens descartadas.** *Regras de inclusão* (a vitrine aponta para módulos
e o conteúdo entra por herança) foi recusada porque "por que esse aluno está
vendo isso?" deixa de ter resposta direta — vira simulação mental de regras, e
o custo de errar aqui é aluno pagante sem acesso. *Lista explícita pura*, sem
atalhos, foi recusada pelo custo de curadoria sobre 1.394 aulas. A escolhida
mantém o banco explícito e auditável (`SELECT` responde tudo) e resolve a
ergonomia na UI.

---

## 4. Modelo de dados

```prisma
model Showcase {
  id                String    @id @default(uuid())
  title             String
  slug              String    @unique
  description       String?
  thumbnail         String?
  isPublished       Boolean   @default(false)
  position          Int       @default(0)
  // product.id do TheMembers. Nullable: vitrine e produto nascem em
  // momentos diferentes; sem vínculo ela só serve a cortesia/migração.
  externalProductId String?   @unique
  // Libera TODO o catálogo, inclusive aula publicada depois. É como a
  // pós-graduação é modelada sem materializar 1.394 linhas.
  grantsAllContent  Boolean   @default(false)
  previewSeconds    Int?      // override do default global
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?

  videos            ShowcaseVideo[]
  entitlements      Entitlement[]
}

model ShowcaseVideo {
  showcaseId String
  videoId    String
  addedAt    DateTime @default(now())

  showcase   Showcase @relation(fields: [showcaseId], references: [id], onDelete: Cascade)
  video      Video    @relation(fields: [videoId],    references: [id], onDelete: Cascade)

  @@id([showcaseId, videoId])
  @@index([videoId])
}

model Entitlement {
  id              String    @id @default(uuid())
  userId          String
  showcaseId      String
  grantedAt       DateTime  @default(now())
  expiresAt       DateTime?           // null = vitalício
  revokedAt       DateTime?
  revokedReason   String?
  source          EntitlementSource
  externalOrderId String?             // order.id que gerou

  user            User     @relation(fields: [userId],     references: [id], onDelete: Cascade)
  showcase        Showcase @relation(fields: [showcaseId], references: [id], onDelete: Cascade)

  @@unique([userId, showcaseId])
  @@index([userId, revokedAt, expiresAt])
}

enum EntitlementSource {
  PURCHASE
  GRANDFATHER
  COURTESY
  ADMIN
}

model WebhookEvent {
  id          String    @id @default(uuid())
  externalId  String    @unique   // payload.id — chave de idempotência
  provider    String              // "themembers"
  event       String              // release.access | revoke.access | ...
  payload     Json
  receivedAt  DateTime  @default(now())
  processedAt DateTime?
  error       String?
}
```

**`Entitlement` é separado de `Enrollment`, deliberadamente.** `Enrollment`
continua significando "começou a assistir" e continua sendo criado sozinho.
`Entitlement` significa "tem direito". Fundir os dois faria a primeira visita a
um preview de 2 minutos virar um registro indistinguível de compra.

**Recompra reaproveita a linha.** Com `@@unique([userId, showcaseId])`,
reembolso preenche `revokedAt` e recompra limpa. "Esse aluno tem acesso?" é
sempre uma linha. O histórico completo vive em `WebhookEvent`.

---

## 5. Fluxo do webhook (TheMembers)

`POST /api/v1/webhooks/themembers` — rota **pública**, fora do
`FirebaseAuthGuard`.

### 5.1 Recebimento

1. **Validar assinatura.** Header `X-Signature` = HMAC-SHA256 do **corpo cru**
   com o token do webhook, comparação timing-safe. Inválido → **403**.
2. **Idempotência.** Gravar `WebhookEvent` com `externalId = payload.id`.
   Violação de unique = reenvio → responder **200** e encerrar.
3. Processar conforme `payload.event`.

> ⚠️ `NestFactory.create(AppModule, { rawBody: true })` e leitura do buffer cru
> no handler. Validar HMAC sobre o JSON re-serializado **nunca** bate — é a
> causa nº 1 de webhook que "não funciona" nesse tipo de integração.

### 5.2 `release.access`

```
product.id      → Showcase.externalProductId
customer.email  → User (cria se não existir)
product.expires_in → Entitlement.expiresAt
order.id        → Entitlement.externalOrderId
source          = PURCHASE
```

Usuário inexistente: cria `User` no Postgres, `firebaseAdmin.createUser()`,
**grava o `firebaseUid`**, dispara `sendPasswordResetEmail()`. As três peças já
existem em `firebase-admin.service.ts:135/195/210`.

### 5.3 `revoke.access`

Mesma resolução; preenche `revokedAt` e `revokedReason` com o evento de origem
(reembolso, chargeback, cancelamento).

### 5.4 Falha de processamento — responder 200 mesmo assim

Se o `product.id` não estiver mapeado para nenhuma vitrine, gravar o evento com
`error` preenchido, expor numa fila de reprocessamento no admin, e **responder
200**.

Motivo: o TheMembers tenta 3 vezes (30s, 60s, 120s) e depois marca como falho
**e nunca mais reenvia**. Devolver erro num caso que só o admin resolve faz a
compra evaporar. Com o evento salvo, o reprocessamento é um clique.

### 5.5 Referência do payload

Campos usados de `payload.data`:

| Uso | Caminho |
|---|---|
| Vitrine | `product.id` |
| Nome do produto (conferência visual no admin) | `product.name` |
| Validade | `product.expires_in` |
| Comprador | `customer.email` · `customer.name` · `customer.document_number` |
| Pedido | `order.id` · `order.transaction.status` · `order.transaction.paid_at` |

Eventos do checkout: `release.access`, `revoke.access`, `order.completed|canceled|expired`,
`transaction.approved|failed|refunded|charged_back|pending_refund|payment_cc_initiated|pix_generated|boleto_generated`,
`abandoned`. **Só os dois de acesso são consumidos**; os demais ficam
registrados em `WebhookEvent` se forem assinados no painel.

Docs: <https://documentation.themembers.dev.br/webhooks/webhooks-do-checkout>

---

## 6. Gate de leitura

Um vídeo é acessível se **qualquer** condição valer:

- usuário é `ADMIN` ou `INSTRUCTOR`
- tem `Entitlement` ativo em vitrine com `grantsAllContent`
- tem `Entitlement` ativo em vitrine que contém aquele vídeo

**Ativo** = `revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt > now())`.

Implementação: uma query por request carrega os `videoId` liberados do usuário
(join `Entitlement` × `ShowcaseVideo`) e vira um `Set` em memória. Com 1.394
aulas o custo é irrelevante — sem Redis, sem cache distribuído.

Os endpoints de curso e vídeo passam a devolver `hasAccess: boolean` por aula.

---

## 7. Preview

Backend envia `hasAccess`; os players cortam.

- Web: `frontend-web/src/components/video-player/hls-video-player.tsx`
- Mobile: `mobile-app/src/components/video/VideoPlayer.tsx` (expo-video)

Ambos recebem `previewSeconds` e pausam com overlay de oferta da vitrine.

**Duração do preview:** `min(120s, 50% da duração da aula)`. O teto de 50%
existe para que aulas curtas — vinhetas, apresentações — não sejam liberadas
inteiras pelo preview. Ajustável por vitrine via `Showcase.previewSeconds`.

---

## 8. Migração (grandfather)

Uma vitrine `Acesso completo (legado)` com `grantsAllContent = true`, e 30
`Entitlement` com `source = GRANDFATHER` e `expiresAt = null`. Script único,
dentro de uma transação.

Ninguém do cohort perde acesso, e fica visível quem tem acesso por herança e
quem tem por compra.

---

## 9. Pré-requisito de segurança — `firebaseUid`

**Bloqueante para a etapa 5.** Não é opcional.

`firebase-auth.guard.ts:45-53` resolve identidade **só por e-mail**
(`firebaseUid` está no código como comentário "no futuro"). Com criação
automática de conta a partir de um webhook de pagamento, o vetor é concreto:
**alguém compra usando o e-mail de um admin → o sistema cria a conta Firebase
com esse e-mail → o login vincula ao `User` admin existente → takeover de
ADMIN pelo preço de uma vitrine.**

O handoff `docs/HANDOFF-2026-08-11-pre-live-execucao.md` §5.3 tratava esse fix
como condição para reabrir o registro público. Esta feature o promove a
pré-requisito.

Escopo do fix:
- `firebaseUid String? @unique` no modelo `User`
- popular no register, no primeiro login e na criação via webhook
- guard resolve por UID, com fallback por e-mail **só** quando
  `email_verified === true`
- auditar quais `User` de produção não têm conta Firebase correspondente

---

## 10. Ordem de entrega

| # | Etapa | Por que nesta posição |
|---|---|---|
| 1 | `firebaseUid` + guard por UID | Pré-requisito de segurança |
| 2 | Modelo + admin de vitrines | Monta e revisa vitrines sem afetar aluno |
| 3 | Grandfather + gate de leitura | Gate liga com todos liberados |
| 4 | Preview nos players | A partir daqui o bloqueio é visível |
| 5 | Webhook TheMembers | A primeira compra fecha o ciclo |

A ordem não é arbitrária: o gate entra no ar (3) com todo mundo já liberado,
então um erro de composição de vitrine se manifesta como "aula deveria estar
bloqueada e não está" — falha benigna. Invertido, o primeiro erro seria aluno
pagante trancado do lado de fora.

---

## 11. Riscos aceitos

| Risco | Decisão | O que reabre |
|---|---|---|
| **Preview contornável.** Nível 1: a URL do `playlist.m3u8` completo continua indo ao cliente e o objeto no R2 é público. Qualquer aluno com DevTools assiste a aula inteira e pode compartilhar o link. | Aceito em 2026-08-12. Níveis 1 e 2 compartilham quase todo o trabalho (gate, paywall, webhook) — a diferença é onde o corte acontece, então subir depois é barato. | Evidência de link circulando, ou ticket médio que justifique o trabalho de infra. |
| **Vínculo produto↔vitrine é digitado à mão.** `externalProductId` errado libera a vitrine errada para quem pagou. | Aceito. Mitigação: o admin exibe `product.name` recebido no primeiro evento, para conferência visual. | — |

**Níveis de proteção descartados nesta rodada, para referência futura:**
*Nível 2* — o backend serve um `.m3u8` truncado contendo só os segmentos dos
2 primeiros minutos; o player nunca recebe a referência do resto, sem
reencodar nada. *Nível 3* — token assinado no Worker, que só serve segmento
com token válido por usuário e aula (a peça de URL assinada já existe no
caminho admin do `r2-browser`).

---

## 12. Fora de escopo

- Checkout próprio — a venda acontece no TheMembers
- Preço, cupom e afiliado na plataforma — vivem no gateway
- Reorganizar o catálogo atual em cursos temáticos
- Vitrine como unidade de navegação do aluno
- Relatórios de conversão do preview

---

## 13. Referências

- Webhooks do checkout: <https://documentation.themembers.dev.br/webhooks/webhooks-do-checkout>
- Payload do webhook de acesso: <https://documentation.themembers.dev.br/webhooks/webhooks-do-checkout/estrutura-dos-webhooks/webhook-de-acesso.md>
- Configuração no painel: <https://ajuda.themembers.com.br/pt-br/article/como-configurar-webhooks-externos-em-produtos-do-checkout-themembers-hijlh0/>
- API TheMembers (students, subscriptions, products, courses; 300 req/min): <https://documentation.themembers.dev.br/api-reference>
- Estado do projeto: `docs/HANDOFF-2026-08-11-pre-live-execucao.md`
