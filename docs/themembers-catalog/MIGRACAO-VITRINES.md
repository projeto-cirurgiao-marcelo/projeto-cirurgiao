# Migração TheMembers → Vitrines (showcases)

Guia operacional para replicar produtos da TheMembers como vitrines na nossa plataforma.
Ver também: `README.md` (catálogo de conteúdo), `themembers-produtos.json` (81 produtos), memory `acesso-api-themembers`.

## Modelo

**Vitrine (`Showcase`) = um produto vendável da TheMembers** (os de `/en/produto`). É camada de
permissão: lista explícita de vídeos (`ShowcaseVideo`), pode cruzar cursos. Vincula ao produto
via `externalProductId`. `grantsAllContent=true` para produtos "plataforma inteira" (não materializa vídeos).

**Atenção:** os IDs da TheMembers NÃO são os IDs do nosso Postgres. Mapear por **título**
via a árvore de cursos da nossa API, nunca copiar IDs do catálogo TheMembers.

## Divergência estrutural (importante)

- TheMembers (30/08/2026): 7 cursos · 61 módulos · 1116 aulas.
- Nossa base de produção: 12 cursos · 165 módulos · 1420 vídeos, com organização diferente
  (ex.: "Cirurgia Na Prática" da TheMembers está quebrada em "Tecidos Moles"/"Ortopedia Na
  Prática"/"Neurocirurgia Na Prática" na nossa base).
- Dos 81 produtos: ~20 são conteúdo real (viram vitrine), ~5 são acesso amplo (`grantsAllContent`),
  ~15 são imersões presenciais (sem conteúdo a liberar), ~15 são teste/lixo/duplicata (ignorar).

## Pré-requisitos para rodar a migração

1. Backend local no ar apontando para o Cloud SQL (proxy na 5433). Ver memory `ambiente-recuperado-pos-roubo`.
2. Token de admin Firebase para a API admin (`FirebaseAuthGuard + @Roles(ADMIN)`):
   - Achar um `User` ADMIN com `firebaseUid`; usar `firebase-admin` (service account em
     `backend-api/firebase-service-account.json`) para `createCustomToken(uid)`;
   - Trocar por ID token em `POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=<WEB_API_KEY>`
     (web key = `NEXT_PUBLIC_FIREBASE_API_KEY` do frontend);
   - Usar como `Authorization: Bearer <idToken>`.
3. ProductId da TheMembers (para `externalProductId`): buscar em
   `GET /api/proxy/checkout/v1/sales/filters/products?cursor=&filter[product]=<termo>` com headers
   `Authorization: Bearer <tm_jwt>`, `x-tenant-id: 5242`, `orgId: 5089`.

## Passo a passo por vitrine (API, prefixo `/api/v1`)

1. `GET /admin/showcases/course-tree` → achar o(s) módulo(s) por título e pegar `id` + `videoCount`.
2. `POST /admin/showcases` body `{title, description?, externalProductId?, isPublished:false}` → pega `id`.
   (slug é derivado do título automaticamente; não enviar.)
3. `POST /admin/showcases/:id/videos/from-module` body `{moduleId, includeUnpublished?, includeSubmodules?}`.
   - **`from-module` exclui não publicados por default.** Muitos vídeos migrados estão `isPublished=false`
     → passar `includeUnpublished:true` para compor a vitrine (ver nota abaixo).
   - Para vitrine que cruza módulos, repetir para cada `moduleId`, ou usar
     `POST /admin/showcases/:id/videos` com `{videoIds:[...]}` (achar ids via `GET /admin/showcases/videos/search?q=`).
4. Conferir: `GET /admin/showcases/:id`.
5. Publicar só quando validado: `PATCH /admin/showcases/:id {isPublished:true}`.

## ⚠️ Nota de dados: vídeos não publicados

Muitos módulos migrados têm os vídeos com `isPublished=false` (o conteúdo está no R2 `r2_hls`, só não
foi publicado). A vitrine pode conter vídeos não publicados, mas **o aluno só assiste vídeo publicado** —
publicar os vídeos é passo separado e deve ser decidido pelo professor, não automatizado em massa.

## Piloto executado (30/08/2026)

- **Curso Cistotomia Descomplicada** — vitrine `2d8f7640-d4dd-4a73-93cb-a7763ba5bfaf`,
  slug `curso-cistotomia-descomplicada`, `externalProductId=7475997518902829056`,
  `isPublished=false`. 8 vídeos do módulo `0765e39b-a514-40e5-b5a2-dc3a497c0963`
  (Cistotomia Descomplicada, curso Treinamentos Premium). Todos os 8 estão `isPublished=false` na base.

## Rodada Grupos A+B (30/08/2026) — 10 vitrines criadas (todas isPublished=false)

Criadas via `tmp-build-vitrines.js` (script descartável; resolve módulos/cursos POR TÍTULO no
banco, não por UUID). Todas em rascunho. `extProd` = externalProductId quando achado no checkout.

| Vitrine | vids | extProd | origem na base |
|---|---|---|---|
| Curso Cistotomia Descomplicada | 8 (0 pub) | 7475997518902829056 | mód. Cistotomia Descomplicada (Treinamentos Premium) |
| Uretrostomia Perineal em Felinos | 9 | — | mód. homônimo (Treinamentos Premium) |
| Ruptura Diafragmática Descomplicada | 10 | — | mód. homônimo (Treinamentos Premium) |
| Mastectomia Descomplicada | 10 | 7471290785321938944 | mód. homônimo (Treinamentos Premium) |
| Como se tornar um cirurgião volante | 6 | — | mód. homônimo (Treinamentos Premium) |
| Direcionamento para a Residência | 2 | — | mód. Direcionamento para Residência |
| Neurocirurgias na Prática | 28 | 7471290324867235840 | curso Neurocirurgia Na Prática |
| Ortopedia na Prática | 136 | 7471288702428860416 | curso Ortopedia Na Prática |
| Aprofundamento Ortopedia | 48 | — | curso inteiro (7 módulos) |
| Aprofundamento Tecidos Moles | 315 | — | curso inteiro (47 módulos) |
| Manual de Suturas | 13 (0 pub) | — | mód. Manual de Suturas (Treinamentos Premium) |

## Reformulação (31/08/2026) — regra "só é vitrine quem tem checkout ativo"

Critério do professor: **um produto TheMembers só vira vitrine se tiver checkout ativo**
(vendável de fato). Produtos que existem como conteúdo mas não estão à venda NÃO viram vitrine.
Sinal usado: coluna "Checkout" da página `/en/produto` (One-time Sale / Recurring vs. vazio).

**Arquivadas (sem produto com checkout ativo):**
Uretrostomia Perineal em Felinos, Ruptura Diafragmática Descomplicada,
Direcionamento para a Residência (só E-book), Manual de Suturas (sem produto).

**Vitrines ativas confirmadas (produto com checkout):** Castração Descomplicada,
Curso Cistotomia Descomplicada, Mastectomia Descomplicada, Como se tornar um cirurgião volante,
Neurocirurgias na Prática, Ortopedia na Prática.

**Aprofundamento Ortopedia** e **Aprofundamento Tecidos Moles**: mantidas em rascunho (decisão do
professor), sem produto de checkout próprio confirmado.

**Correção de vínculo:** Ortopedia na Prática estava apontando para "Ortopedia na Prática - Oferta
Especial" (INATIVO, `7471288702428860416`); corrigido para o produto ativo recorrente
`7480302156014436352`.

### Dois identificadores de produto na TheMembers (importante para o webhook)
Cada produto tem: um **UUID** (id do link de edição, ver `themembers-product-ids.json`) e uma
**key numérica** (snowflake, do sistema de checkout/vendas). A vitrine legada "Castração" usa a
**key numérica** como `externalProductId` — seguimos essa convenção. ⚠️ A key numérica só aparece
no endpoint `sales/filters/products` DEPOIS da 1ª venda; produtos com checkout mas sem vendas (ex.:
"Como se tornar um cirurgião volante") ficam com `externalProductId` nulo até confirmarmos o formato
do payload do webhook de compra.

**Pendências:**
- `externalProductId` nulo em: Como se tornar um cirurgião volante (produto sem vendas ainda),
  Aprofundamento Ortopedia, Aprofundamento Tecidos Moles.
- Vídeos NÃO publicados: Cistotomia (0/8). As demais ativas têm vídeos publicados.
- Nenhuma foi publicada nem recebeu entitlement — decisão do professor.
- Confirmar formato do payload do webhook (key numérica vs UUID) antes de construir o handler de compra.

## Pendente (não feito — aguarda decisão)

- **Grupo C (ambíguo):** Top 10 Cirurgias (só achamos módulo de 3 vids), Cirurgias do Sistema Urinário /
  Trato GI (módulos vazios em Aprof. Tecidos Moles vs. conteúdo real em Pós-graduação), Tecidos Moles Na Prática.
- **Grupo D (sem conteúdo na base):** Cirurgias Oftálmicas Básicas, Cirurgia Reconstrutiva, Cabeça e Pescoço — módulos com 0 vídeos.
- **Grupo E (grantsAllContent):** Plataforma Projeto Cirurgião, Acesso Total, Combos — papel já coberto por "Acesso completo (legado)".

## Vitrines já existentes antes desta rodada (não recriar)

- `Acesso completo (legado)` — `grantsAllContent`, 30 entitlements GRANDFATHER, despublicada.
- `Castração Descomplicada` — 19 vídeos, publicada, `externalProductId=7480227495418253312`.
