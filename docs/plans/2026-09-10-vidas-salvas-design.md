# Plano — Contador de Vidas Salvas (web + mobile + tela corporativa)

> Status: rascunho v4 para discussão, 2026-09-10. Nada implementado.
> Protótipo interativo (dados fictícios): artifact "Mural de Vidas".
> Premissas (Gustavo, 10/09):
> 1. Cada unidade do contador é um **relato** preenchido por um médico
>    veterinário, com moderação. O número é derivado, nunca editado à mão.
> 2. **Obrigatórios: só nome completo, CRMV e a descrição de atribuição**
>    ("por que você atribui essa vida salva a algo que aprendeu no Projeto
>    Cirurgião?"), esta sem limite mínimo ou máximo de palavras. Tudo o mais
>    (cargo, espécie, data, fotos, vídeos, etc.) é opcional.
> 3. **Só usuários logados** veem o contador e relatam. Nada público: sem
>    número na landing, sem página pública de história. A tela corporativa
>    usa uma credencial de exibição emitida pelo admin (§5.4), não é aberta.
> 4. **O contador é a porta de entrada das histórias.** Clicável/interativo:
>    número e "mural de pontos" (um ponto por vida) levam ao relato do autor.

## 1. Princípios

1. **Todo número tem um relato por trás.** `total = COUNT(relatos APROVADOS)`.
   Não existe campo "quantidade" editável.
2. **Moderação antes de contar.** Relato nasce como rascunho, vira `PENDING`
   ao ser enviado e só entra no número após um ADMIN aprovar (texto e mídia).
   Cobre a exigência das lojas para conteúdo gerado por usuário (Apple 1.2).
3. **Autenticado lê e escreve, admin aprova, tela corporativa só lê com
   credencial própria.** Três controllers no mesmo módulo, espelhando
   `showcases/`, mas nenhum sem guard.
4. **Mídia vai direto pro R2, nunca pelo backend.** Prefixo próprio
   `lives-saved/`, fora de `inbox/` (que dispara o pipeline de aulas).
5. **Falha silenciosa nos clientes.** Se a API cair, Home do app e landing
   mostram o último número conhecido.

## 2. Modelo de dados (Prisma)

Migration única após `20260904180000_course_instructor_display`, com três
mudanças: model `LifeSavedReport`, model `LifeSavedReportMedia`, coluna
`crmv` em `UserProfile`.

### 2.1 `LifeSavedReport` → `life_saved_reports`

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | |
| reporterId | FK User | quem relatou (qualquer usuário ativo) |
| status | enum | `DRAFT`, `PENDING`, `APPROVED`, `REJECTED` |
| source | enum | `SELF` ou `ADMIN_BACKFILL` |
| reporterName | string **obrigatório** | nome completo, pré-preenchido de `User.name`, editável |
| reporterCrmv | string **obrigatório** | até 20 chars, normalizado (trim, caixa alta). Formatos variam por UF, não validar regex rígida. Pré-preenchido de `UserProfile.crmv` |
| attribution | `text` **obrigatório** | "Por que você atribui essa vida salva a algo que aprendeu no Projeto Cirurgião?". **Sem limite mínimo ou máximo de palavras.** Única validação: não vazio após `trim` |
| reporterTitle | string? | cargo/função, livre |
| onBehalfOfName | string? | só `ADMIN_BACKFILL` sem conta |
| species / speciesOther | enum? + string? | `CANINE`, `FELINE`, `EQUINE`, `BOVINE`, `WILD`, `OTHER`; nulo = "não informado" |
| animalName | string? | |
| occurredAt | date? | |
| procedureSummary | string? ≤160 | uma linha; quando ausente, listagens e tela corporativa usam excerto de `attribution` |
| impactType | enum? | `DIRECT`, `INDIRECT` |
| relatedCourseId | FK Course? | |
| consentPublicStory / consentShowName | boolean, default false | checkboxes, não campos; sem marcar, o relato conta no número mas não aparece como história pública |
| reviewedById / reviewedAt / rejectionReason | | |
| submittedAt | datetime? | quando saiu de DRAFT |
| createdAt / updatedAt / deletedAt | | |

Índices: `[status, createdAt]`, `[reporterId, createdAt]`, `[deletedAt]`.

Postgres `text` não tem limite prático (1 GB). O body JSON do Nest está em
50 MB (`main.ts:59`), folga enorme. Nos clientes, nenhum `maxLength` nem
contador de mínimo no campo; renderização com `whitespace-pre-wrap` na web
e `TextInput multiline` sem `maxLength` no mobile.

DTO de `submit` (class-validator, `forbidNonWhitelisted` global):
`reporterName` `@IsString() @IsNotEmpty()`, `reporterCrmv` `@IsString()
@IsNotEmpty() @MaxLength(20)`, `attribution` `@IsString() @IsNotEmpty()`
(após `@Transform(trim)`); todos os outros `@IsOptional()`. `ADMIN_BACKFILL`
dispensa `reporterCrmv` quando o caso histórico não tem o dado (ver §8).

### 2.2 `LifeSavedReportMedia` → `life_saved_report_media`

| Campo | Notas |
|---|---|
| id, reportId (FK, cascade) | |
| kind | `PHOTO` ou `VIDEO` |
| r2Key | `lives-saved/<reportId>/<uuid>.<ext>` |
| url | `CLOUDFLARE_R2_PUBLIC_URL + r2Key` |
| mimeType, sizeBytes | confirmados via HEAD no R2 (`getFileMetadata`) |
| width, height, durationSec | opcionais, informados pelo cliente |
| caption | string?, legenda opcional |
| order | int | 
| status | `UPLOADING`, `READY` |
| createdAt | |

Índice `[reportId, order]`.

### 2.3 `UserProfile.crmv String?`

Pra lembrar o CRMV entre relatos e pré-preencher o formulário. `profession`
já existe e serve de pré-preenchimento pro cargo.

### 2.4 LGPD

Na autoexclusão (`users.service.ts:500-560`) o relato **fica** (User já é
anonimizado). Acrescentar à transação: `reporterName = 'Médico(a)
veterinário(a)'`, `reporterCrmv = null`, `consentShowName = false`, e
apagar as mídias do usuário no R2 (`deleteFile`) e no banco. Foto e vídeo
são dado pessoal; o texto anonimizado pode ficar.

## 3. Upload de mídia

Decisão: **presigned PUT direto no R2**, gerado pelo backend com
`CloudflareR2Service.getSignedUploadUrl(key, contentType)` (já existe em
`cloudflare-r2.service.ts:244`). Motivos: o Worker `r2-browser` só aceita
ADMIN (`auth.ts:37,64`); passar vídeo pelo backend esbarra no body de 50 MB
e no timeout do Cloud Run; presigned funciona igual em web (`fetch PUT`) e
mobile (`expo-file-system` `uploadAsync` com método PUT).

Fluxo:
1. `POST /lives-saved` cria o relato em `DRAFT` e devolve o id.
2. `POST /lives-saved/:id/media/upload-url` `{ kind, mimeType, sizeBytes,
   fileName }` → valida tipo/tamanho, cria a linha `UPLOADING`, devolve
   `{ mediaId, url, key, expiresIn: 3600 }`.
3. Cliente faz PUT no R2 com barra de progresso.
4. `POST /lives-saved/:id/media/:mediaId/confirm` → backend faz HEAD no
   objeto, grava `sizeBytes`/`mimeType` reais, marca `READY`. Se o objeto
   não existe, 400.
5. `DELETE /lives-saved/:id/media/:mediaId` apaga no R2 e no banco (só
   enquanto DRAFT ou PENDING, e só do autor).
6. `POST /lives-saved/:id/submit` → exige os três obrigatórios (nome, CRMV,
   atribuição) e nenhuma mídia `UPLOADING`; vira `PENDING`.

Limites propostos (decisão pendente, ver §8): até 10 fotos de 15 MB
(`jpeg`, `png`, `webp`, `heic`) e até 3 vídeos de 500 MB (`mp4`, `mov`).
Presigned PUT simples aguenta até 5 GB por objeto, então o teto é escolha
de produto, não técnica.

Reprodução: MP4/MOV direto pelo CDN do R2, `<video>` na web e `expo-video`
no mobile (já usado no player de aulas). Sem HLS em V1. HEIC não toca no
browser: converter pra JPEG no cliente antes do upload (web: canvas;
mobile: `expo-image-picker` já devolve JPEG com `exif:false`). Vídeo em
HEVC gravado no iPhone pode não tocar em Android/Chrome: em V2, copiar pra
`inbox/` na aprovação (`copyFile` existe) e deixar o pipeline gerar HLS.

Lixo: job diário (módulo `jobs`, BullMQ já existe) apaga relatos `DRAFT`
com mais de 7 dias e seus objetos, e mídias `UPLOADING` com mais de 24 h.

Pré-requisito a verificar antes da fase 1: **CORS do bucket R2** precisa
permitir `PUT` de `app.projetocirurgiao.app` e `www.projetocirurgiao.app`
(o upload de thumbnail hoje passa pelo backend, então o bucket pode não
ter CORS de browser). Mobile não sofre CORS.

## 4. Backend (`backend-api/src/modules/lives-saved/`)

Arquivos: `lives-saved.module.ts`, `lives-saved.service.ts`,
`lives-saved-media.service.ts`, `dto/lives-saved.dto.ts`,
`public-lives-saved.controller.ts`, `lives-saved.controller.ts`,
`admin-lives-saved.controller.ts`, specs. Registrar em `app.module.ts`
(imports `FirebaseModule`, `PrismaModule`, `AuditModule`, `CloudflareModule`,
`CacheModule.register({ ttl: 60_000, max: 50 })`).

### 4.1 Leitura (autenticado, qualquer role ativo; ou credencial de exibição)

- `GET /lives-saved/summary` → `{ total, lastApprovedAt, newThisWeek, bySpecies, generatedAt }`. Cache 60 s.
- `GET /lives-saved/wall` → o mural: `total` + lista compacta dos relatos
  aprovados com `consentPublicStory` (`{ id, approvedAt, species?, isMine }`),
  em ordem de aprovação, pra desenhar "um ponto por vida" e destacar os
  novos e os do próprio usuário. Os sem consentimento entram só na contagem.
- `GET /lives-saved/stories?limit=12&cursor=` → cards: `{ id, species?,
  occurredAt?, procedureSummary?, excerpt (≤280), reporterDisplay,
  reporterCrmv?, reporterTitle?, mediaCount, isNew }`.
- `GET /lives-saved/stories/:id` → relato completo (texto integral + mídia).
  Nome, CRMV e cargo só saem com `consentShowName`; sem ele, "Médico(a)
  veterinário(a)".
- Guard: `FirebaseAuthGuard` **ou** `DisplayTokenGuard` (novo, §5.4), via um
  guard composto `LivesSavedReadGuard` que aceita qualquer um dos dois.

### 4.2 Autenticado (qualquer role ativo)

- `POST /lives-saved` (cria DRAFT), `PATCH /lives-saved/:id` (DRAFT ou
  PENDING, só autor), `POST /lives-saved/:id/submit`, `DELETE
  /lives-saved/:id` (DRAFT/PENDING, só autor), `GET /lives-saved/mine`.
- Rotas de mídia do §3. Throttle `upload-url` em 30/min por usuário.
- `submit` com throttle 5/min (anti-spam).

### 4.3 Admin (`admin/lives-saved`, `FirebaseAuthGuard + RolesGuard + @Roles(ADMIN)`)

- `GET /admin/lives-saved?status=&page=&pageSize=`, `GET /admin/lives-saved/:id` (com mídia).
- `POST /admin/lives-saved/:id/approve`, `/reject` `{ reason }`.
  Transições: `PENDING→APPROVED|REJECTED`, `REJECTED→APPROVED`,
  `APPROVED→REJECTED` (retratação; invalida cache).
- `DELETE /admin/lives-saved/:id/media/:mediaId` (remover uma mídia
  imprópria sem rejeitar o relato inteiro).
- `POST /admin/lives-saved` cria `ADMIN_BACKFILL` já `APPROVED`, com o
  mesmo fluxo de mídia.
- `GET /admin/lives-saved/stats`.
- Audit em `audit.constants.ts`: `lives_saved.approve`, `.reject`,
  `.admin_create`, `.delete`, `.media_removed`; entity type
  `'life_saved_reports'`.

### 4.4 Testes

`lives-saved.service.spec.ts`: transições de status, `summary` ignora
DRAFT/PENDING/REJECTED/deletado, `stories` respeita os dois consentimentos,
`mine` não vaza relato de outro, `submit` bloqueado com mídia `UPLOADING` ou
sem um dos três obrigatórios, `submit` aceita `attribution` de uma frase e de
50 mil palavras, `PATCH` bloqueado após aprovação. `lives-saved-media.service.spec.ts`:
validação de tipo/tamanho, chave gerada no prefixo `lives-saved/`, confirm
falha sem objeto.

## 5. Web (`frontend-web/`)

Service `src/lib/api/lives-saved.service.ts` + tipos
`src/lib/types/lives-saved.types.ts`. Helper `src/lib/api/lives-saved-upload.ts`
(PUT presigned com progresso via `XMLHttpRequest`, conversão HEIC→JPEG).

Componente compartilhado `src/components/lives-saved/AnimatedCounter.tsx`
(framer-motion, `.atlas-num`, `prefers-reduced-motion`, formato `pt-BR`).

### 5.1 Aluno

- `/student/my-courses`: entrada "Vidas salvas" em `AtlasStatsInline` + card CTA.
- `/student/vidas-salvas`: lista "Meus relatos" (rascunhos, pendentes,
  aprovados, rejeitados com motivo) + botão "Novo relato".
- `/student/vidas-salvas/novo` e `/student/vidas-salvas/[id]`: formulário
  em etapas (react-hook-form + zod, padrão de `admin/courses/new`):
  1. **Quem relata**: nome completo* (pré-preenchido), CRMV* (pré-preenchido
     de `profile.crmv`), cargo (opcional).
  2. **Por que você atribui essa vida salva ao Projeto Cirurgião?*** —
     `Textarea` autoexpansível, sem `maxLength`, sem contador de mínimo. É a
     etapa central; as demais ficam claramente marcadas como opcionais.
  3. **Sobre o caso** (opcional): espécie, nome do animal, data, resumo em
     uma linha, tipo de impacto, curso relacionado.
  4. **Fotos e vídeos** (opcional): dropzone com pré-visualização, progresso
     por arquivo, legenda, reordenar, remover.
  5. **Consentimentos** (checkboxes, default desmarcado) e envio. Botão
     "Enviar" habilita assim que os três obrigatórios estão preenchidos,
     mesmo com as etapas 3 e 4 vazias. Autosave do rascunho a cada mudança.
- Item na `student-sidebar.tsx`.

### 5.2 Admin

- `/admin/vidas-salvas`: tabs por status, tabela, drawer com texto integral
  (`whitespace-pre-wrap`), galeria de fotos, player de vídeo, dados do vet
  (nome, cargo, CRMV, e-mail da conta), botões Aprovar / Rejeitar (dialog
  com motivo), "Remover mídia". Padrão `useState` + Dialog + sonner.
- Dialog "Adicionar relato histórico" (backfill, mesmo formulário).
- Entrada no grupo `Sistema` de `admin-sidebar.tsx` com badge de pendentes.
- Card "Vidas salvas" no dashboard `/admin`.

### 5.3 Mural e história (aluno)

- `/student/vidas`: o mural. Número grande com count-up, grade de pontos
  (um por vida; azul = com relato público, cinza = privado, coral = novo
  na semana, anel = meu), tooltip no hover com procedimento e autor, clique
  abre a história. Abaixo, "Relatos recentes" em cards.
- `/student/vidas/[id]`: a história. Pergunta obrigatória em destaque, texto
  integral em serifa, mídia opcional, autor com nome, cargo e CRMV (se
  consentido), CTA "Relatar minha experiência".
- O stat "Vidas salvas" da Home é um botão que leva ao mural.
- Landing pública: **nada**. `StatsStrip.tsx` fica como está.

### 5.4 Tela corporativa — `src/app/display/vidas/`

Como só logados veem o número, a TV precisa de credencial. Duas opções:
- (a) Logar na TV com uma conta ADMIN. Zero código, mas deixa uma sessão
  de admin num browser de recepção. **Não recomendo.**
- (b) **Credencial de exibição** (recomendado): tabela `display_tokens`
  (`id, label, tokenHash, createdById, lastSeenAt, revokedAt`). Admin gera
  em `/admin/vidas-salvas` → "Telas", recebe um link
  `/display/vidas?token=…` uma única vez. `DisplayTokenGuard` aceita o
  token só nas rotas de leitura do §4.1 (nunca em `admin/`, nunca em
  escrita). Revogável a qualquer momento. É "logado" no sentido de
  credencial emitida pelo admin, não acesso aberto.

Tela:
- `layout.tsx` mínimo: sem sidebar, sem guard de aluno, `robots: noindex`.
- `page.tsx` `'use client'`: lê o `token` da URL, guarda em `sessionStorage`
  e limpa da barra; viewport inteiro; **paleta = tokens dark do Atlas**
  (`bg #0F172A`, `surface #1E293B`, `line #334155`, `ink #F8FAFC`, `muted
  #CBD5E1`, `atlas-primary` na barra de progresso, `atlas-success` no
  indicador "ao vivo", `atlas-warn` em "novos esta semana"); logo; número
  em `clamp(96px, 18vw, 320px)` Source Serif 4 peso 500; tagline em serif;
  rodapé mono "atualizado há X min · +N esta semana"; card da história =
  surface + border `rounded-md`, sem sombra.
- Rotação de histórias com consentimento a cada 10 s (crossfade + barra de
  progresso): excerto da atribuição, espécie e procedimento quando
  informados, "Dr(a). Nome · CRMV" ou anônimo, foto de capa ou vídeo mudo
  em loop com `?video=1`.
- QR code apontando pra `/student/vidas/[id]` (abre no app se logado; se
  não, cai no login e volta). Sem página pública.
- Polling do `summary` a cada 60 s; count-up só quando o total muda.
- Query params: `?stories=0`, `?video=1`, `?refresh=30`, `?theme=light`, `?tagline=`.
- Resiliência: mantém último número se a API falhar; Screen Wake Lock.
- Runbook em `frontend-web/docs/`: Chrome `--kiosk`.

### 5.5 Regras de design (Atlas, `docs/atlas/DESIGN_SYSTEM.md`)

Tudo da área do aluno em `src/components/atlas/*`, nunca shadcn direto.
- **Home**: o contador é mais um item de `AtlasStatsInline` (serif 22px,
  `.atlas-caps` no label), clicável, hover `bg-atlas-surface-2`, sem
  gradiente, sem sombra, sem translate. "+3 esta semana" em `font-mono`
  cor `atlas-warn-deep` (âmbar = tempo, azul = ação).
- **Mural**: `AtlasPageHeader metaLabel="Comunidade" title="Vidas" titleEm="salvas"`;
  número em serif 48px/500 (única adição à escala, registrar no DS como
  papel "display"); grade de pontos em `AtlasCard` (`border-atlas-line`,
  `rounded-md`); pontos: `atlas-primary` com relato público,
  `atlas-line-strong` privado, `atlas-warn` novos da semana, anel
  `atlas-primary-2` no meu. Tooltip = surface + border, não navy.
- **História**: h2 serif 22px/500 `tracking-[-0.01em]`; corpo do relato em
  serif 16px/1.65 `whitespace-pre-wrap`; datas compactas mono 10.5px;
  chips `rounded-sm` caps; avatar `atlas-primary-soft` + iniciais; botões
  `AtlasButton` (primary / secondary).
- **Dark mode** sai dos tokens `.dark`, sem código condicional.
- **Admin** continua shadcn (fora do escopo Atlas).

## 6. Mobile (`mobile-app/`)

- **Dependência nova: `expo-image-picker`** (fotos e vídeos da galeria ou
  câmera). É módulo nativo → exige **nova build EAS** (preview e dev
  client), não é OTA. Reintroduz permissões de câmera/galeria removidas no
  bloco AND-4: atualizar Data Safety no Play Console e
  `NSPhotoLibraryUsageDescription` / `NSCameraUsageDescription` no
  `app.json`. Upload via `expo-file-system` (`uploadAsync`, PUT, com
  progresso).
- Service `src/services/api/lives-saved.service.ts` (fail-silent nas
  leituras, lança nas escritas).
- Store persistido `src/stores/lives-saved-store.ts` (`persist` +
  AsyncStorage) com `{ total, fetchedAt }` e rascunho local do formulário
  (pra não perder texto longo se o app for morto).
- Home `app/(tabs)/index.tsx`: `LivesSavedBanner` logo após a busca e
  antes do banner Mentor IA (o protótipo mostra essa ordem), count-up
  reanimated, "N novos esta semana", toque leva à lista. Fetch no
  `Promise.all` de `loadData` com `.catch(() => null)`.
- Lista `app/lives-saved/index.tsx`: número grande, mural em miniatura
  (grade 16 colunas), cards recentes, FAB "Relatar".
- Telas: `app/lives-saved/index.tsx` (meus relatos), `app/lives-saved/new.tsx`
  e `app/lives-saved/[id].tsx` (mesmas 5 etapas e mesma regra de
  obrigatoriedade, `ScrollView` + `KeyboardAvoidingView`, `TextInput
  multiline` sem `maxLength`, grade de mídia com progresso). Registrar no Stack protegido de `app/_layout.tsx`.
- Perfil: item "Vidas salvas" em `menuItems`; campo CRMV em
  `app/profile/edit.tsx`.
- **Tokens** (`src/constants/colors.ts`, `StyleSheet` como o resto da Home,
  não className): banner no molde exato do banner Mentor IA
  (`bannerContainer`: `marginHorizontal: Spacing['2xl']`, `BorderRadius.lg`,
  `Shadows.md`, `LinearGradient` `Colors.gradientNavy`, ícone em círculo 48
  `rgba(255,255,255,.2)`, título `FontSize.base` bold, subtítulo
  `FontSize.sm` 85%); número `FontSize['4xl']` (32) bold, fonte do sistema
  (o app não carrega serifa); pontos `Colors.accent` / `Colors.border` /
  `Colors.warning`; chips `accentSoft` + `accentDark` `BorderRadius.full`;
  cards `BorderRadius.lg` + `Colors.border`; seções `sectionTitle`
  `FontSize.lg` bold, `sectionHeader` `paddingHorizontal: Spacing['2xl']`.
- Sem contador na tela de login em V1.

## 7. Fases e entregas

| Fase | Escopo | Deploy |
|---|---|---|
| 0 | Verificar/configurar CORS do bucket R2 pra PUT do browser | Cloudflare dashboard |
| 1 | Migration + módulo backend + mídia + job de limpeza + specs | `deploy-artifact-registry.ps1` |
| 2 | Web admin (moderação, mídia, backfill) + formulário do aluno + upload | Vercel (autoria `xoiurp`, merge `--rebase`) |
| 3 | Mural + história do aluno + credencial de exibição + tela corporativa | Vercel + deploy backend |
| 4 | Mobile (banner, formulário, picker, store) + nova build EAS | EAS preview Android, depois iOS |
| 5 | Backfill histórico com o Dr. Marcelo (dados) | via admin |

Fase 1 bloqueia todas; 2 e 4 podem andar em paralelo depois dela. A fase
4 é a mais longa por causa da build nativa e das permissões nas lojas.

## 8. Decisões pendentes

1. ~~Quem pode relatar~~ **decidido 10/09**: só logados, pra ver e pra
   relatar. Sem landing, sem página pública.
2. Histórico: relatos individuais retroativos (recomendado) ou número
   consolidado.
3. Tetos de mídia: 10 fotos × 15 MB e 3 vídeos × 500 MB são proposta.
   Sem teto nenhum é possível tecnicamente, mas cada vídeo de 4K de celular
   tem 300 a 400 MB por minuto e o R2 cobra por GB armazenado.
4. Vídeo na tela corporativa: roda mudo em loop ou só foto de capa.
5. Foto com pessoas (tutor, equipe): permitir com consentimento declarado
   no formulário, ou instruir "sem pessoas identificáveis".
6. Texto dos consentimentos, política de moderação e se CRMV aparece em
   público quando o nome aparece.
10. Backfill histórico sem CRMV conhecido: permitir `reporterCrmv` nulo só
    em `ADMIN_BACKFILL` (recomendado) ou exigir sempre.
11. Campos obrigatórios: **decidido em 10/09** — nome completo, CRMV e
    descrição de atribuição, sem limite de palavras. Fechado.
7. Nomenclatura ("vidas salvas" ou "vidas impactadas") e se `INDIRECT`
   conta igual no número principal.
8. Tela corporativa: hardware, tagline, tema claro, QR code sim ou não, e
   confirmar a credencial de exibição (§5.4 opção b) como forma de "logar" a TV.
12. Interação do mural: o protótipo usa "um ponto por vida" com tooltip e
    clique. Validar com o Dr. Marcelo se os relatos sem consentimento público
    devem aparecer como pontos cinza (contam, mas não abrem) ou nem aparecer.
9. Reconhecimento ao vet: XP na aprovação (`xp_rules` existe) e/ou e-mail
   (sem infra hoje).

## 9. Riscos

- Cache in-memory por instância do Cloud Run: aprovação leva até 60 s pra
  refletir no público. Aceitável.
- Texto sem limite + mídia pesada = moderação mais lenta; o drawer do admin
  precisa de leitura confortável (largura de coluna, fonte serif).
- Vídeos HEVC/MOV de iPhone podem não tocar em Chrome/Android sem
  transcode (V2 via pipeline).
- `expo-image-picker` reabre discussão de permissões nas lojas; iOS ainda
  em processo de release.
- CORS do R2 é o único ponto de infra fora do código; se falhar, fallback é
  fotos via backend (multer, 50 MB) e vídeos ficam pra V2.
- Sem CI de backend; deploy manual.
