# Handoff — Worktree `feat/video-player-skin` (dia 1)

**Data**: 2026-04-23
**Branch**: `feat/video-player-skin`
**Worktree**: `D:\dashboard\next-shadcn-admin-dashboard-main\.worktrees\video-player-skin`
**Commits à frente de main**: 14
**Status**: pronto pra continuar; pendências documentadas abaixo

---

## ⚠️ Antes de retomar — leitura obrigatória

1. **CSS global ativo é `globals-premium.css`**, não `globals.css`. O `layout.tsx`
   importa o `-premium`. Editar `globals.css` é no-op. Header de aviso já
   adicionado no topo de `globals.css`.
2. **DB compartilhado com main**: as 2 migrations já foram aplicadas (`prisma
   migrate deploy`). Código antigo do main ignora colunas/tabelas novas (são
   `ADD COLUMN` / `CREATE TABLE`).
3. **Backend worktree precisa rodar do worktree**, não o do main — endpoints
   novos (`/videos/:id/access`, `/upload/share-thumbnail`, `/videos/:id/bookmarks`,
   ForumTopic com `videoTimestamp`) só existem aqui.

---

## Como subir o ambiente amanhã

### Pré-requisitos (já configurados, só verificar)
- Docker desktop com `projeto-cirurgiao-postgres` (5433) e
  `projeto-cirurgiao-redis` (6379) saudáveis.
- `.env` do backend worktree contém:
  - `REDIS_HOST=127.0.0.1` (IPv4 explícito, evita EADDRNOTAVAIL)
  - `QUEUE_ENABLED=true` (sem isso, BullMQ tenta connect em port=0 em loop)
  - `CORS_ORIGINS="http://localhost:3001,http://localhost:3000,http://localhost:3002"`
  - `FRONTEND_URL="http://localhost:3001,http://localhost:3002"`
- `firebase-service-account.json` copiado pra
  `.worktrees/video-player-skin/backend-api/` (gitignored).
- `.env.local` do frontend worktree copiado de `frontend-web/.env.local`
  (contém `NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1` + Firebase).

### Sequência de start
```powershell
# 1) Confirma que main backend NÃO está em :3000
netstat -ano | findstr :3000

# 2) Backend worktree em :3000
cd D:\dashboard\next-shadcn-admin-dashboard-main\.worktrees\video-player-skin\backend-api
npm run start:dev

# 3) Frontend worktree em :3002 (mata main em :3001 se estiver competindo)
cd D:\dashboard\next-shadcn-admin-dashboard-main\.worktrees\video-player-skin\frontend-web
npx next dev -p 3002

# 4) Browser: http://localhost:3002
```

---

## Trabalho concluído (14 commits)

### Fase A — skin tokens
- `0b9151b` — extrai tokens CSS de design (oklch, backdrop, transitions)
  inspirados no Video.js 10 default skin (Apache-2.0).

### Fase B — migração pra media-chrome
- `0677d8a` — overlay manual substituído por `<MediaController>` +
  web components (`MediaPlayButton`, `MediaTimeRange`, `MediaCaptionsButton`,
  `MediaPlaybackRateButton`, `MediaPipButton`, `MediaFullscreenButton`,
  `MediaLoadingIndicator`). HLS.js imperativo preservado, recovery
  intacto. API pública `HlsVideoPlayer` (props + ref) inalterada.
- `7d1ef28` — remove `hls-video-element` (dep órfã, não consumida).

### Fase C — actions
- `24877c1` (C.1) — `controlsList="nodownload noremoteplayback"` +
  `onContextMenu preventDefault`. UX-level, sem DRM.
- `1327a42` (C.2 backend) — model `VideoBookmark` + migration manual
  (`20260423170000_add_video_bookmarks`) + módulo `bookmarks` REST
  (`POST /videos/:id/bookmarks`, `GET`, `PUT`, `DELETE`).
- `46d55be` (C.2 web) — `<VideoBookmarksPanel>` (side panel) + prop
  `onRequestBookmark` no player + integração watch page (desktop/mobile).
- `5126d77` (C.3) — track `kind="chapters"` no `<video>` (convenção
  `playlist.m3u8` → `chapters.vtt` no R2) + `<VideoChaptersPanel>`
  faz fetch+parse VTT inline, render só se VTT existir.
- `ec21a7c` (C.4 backend) — campos `videoTimestamp` + `videoThumbnailUrl`
  em `ForumTopic` + migration manual
  (`20260423180000_forum_topic_video_timestamp`) + módulo `access`
  (`AccessService.canAccessVideo` enrollment-based, hoje; trocável
  pra plan-tags depois) + endpoint `POST /upload/share-thumbnail`
  aberto a usuários autenticados.
- `ca96003` (C.4 web) — `ShareToForumDialog` (modal shadcn) com captura
  canvas client-side + `onRequestShare` no player + `ForumVideoThumbnail`
  no tópico do fórum (clica → `accessService.checkVideoAccess` →
  redireciona ou abre dialog "Inscreva-se em <curso>"). Watch page
  respeita `?t=<segundos>` via `useSearchParams`.

### Polimentos visuais (após primeira validação visual do user)
- `d1c227a` — primeira tentativa glass pill (descartada na refator).
- `70d639d` — refator para icon buttons (`BookmarkButton`, `ShareButton`,
  `QualityButton` em `components/video-player/buttons/`) + `.media-btn`
  + `.media-surface` (Tailwind v4 + `@apply` em `@layer components`).
- `5689dca` — converte CSS pra literal top-level (Tailwind v4 estava
  tree-shaking `@layer components`). **Nota**: descobriu-se depois que
  o arquivo `globals.css` editado **não era** o ativo. O CSS literal
  foi posteriormente migrado pelo outro agente pra `globals-premium.css`.
- `6d3f885` — reduz ícones dos controles nativos pra 18px via
  `--media-button-icon-width/height` em `globals-premium.css` (padrão
  media-chrome era 24px).
- `62db119` — `MediaControlBar` mais compacta: `py-1` → `py-0.5`,
  `rounded-xl` → `rounded-2xl`.

---

## Pendências pra retomar amanhã

### Bloqueadores leves (do dia 1, sem fix ainda)
1. **Categorias do fórum vazias no DB** — modal de share lista categorias
   via `/forum-categories`; lista vem `[]`. Solução rápida (escolher um):
   - **A) Admin UI**: logar como ADMIN e criar via tela de admin do fórum
     (se rota existir).
   - **B) SQL direto**:
     ```bash
     docker exec projeto-cirurgiao-postgres psql -U postgres -d projeto_cirurgiao -c "INSERT INTO forum_categories (id, name, slug, \"order\", \"createdAt\", \"updatedAt\") VALUES (gen_random_uuid(), 'Dúvidas sobre aula', 'duvidas-aula', 1, NOW(), NOW()), (gen_random_uuid(), 'Discussão geral', 'geral', 2, NOW(), NOW());"
     ```
2. **Validação visual completa** — testar end-to-end os 4 flows da fase C
   na watch page: download bloqueado, criar marcador, capítulos (precisa
   VTT no R2 pra aparecer painel), criar tópico via share. Confirmar
   gate "Conteúdo não disponível" funciona com user sem enrollment.
3. **CORS/hotlink no R2** — você ia configurar policy. Sem isso, o
   `captureVideoFrame()` no ShareButton fica null por canvas tainted
   e tópicos no fórum saem sem thumbnail.

### Fora de escopo (sprints separados)
- **Sprint alunos**: import CSV de `docs/alunos-resumo.csv` (~2922 linhas),
  normalizar tags (~30-50 distintas, ex: `Acesso total` vs `Acesso total AsaaS`),
  schema novo `AccessTag` + `User.tags` + `Course.requiredTags`,
  webhook Asaas/Kiwify se houver API.
- **Sprint planos/upsell**: trocar gate `enrollment` por
  `enrollment OR hasRequiredTag()` no `AccessService.canAccessVideo`.
  Frontend `ForumVideoThumbnail` já está pronto pra mostrar
  "Aula não disponível em seu plano" quando o backend retornar
  reason apropriado.
- **DRM real**: Widevine/FairPlay + signed playback tokens + HLS
  encryption. 2-3 semanas + custo recorrente. Avaliar plugins pagos
  primeiro.
- **Watermark dinâmico**: user email/id sobreposto no vídeo.
- **MarkersOverlay na timeline**: bullets visuais nos pontos de bookmark.
- **Edição inline de label** no `VideoBookmarksPanel`.
- **Chapters via DB** (`VideoChapter` model + admin UI upload VTT) —
  hoje só pipeline externo gera VTT.

---

## Aprendizados de método (registrados em memory global)

1. **Ler ponto de entrada antes de editar** — `layout.tsx` define qual
   CSS é o ativo. Não assumir convenção.
2. **Verificar artefato compilado antes do commit** — fluxo correto:
   edit → save → aguardar HMR → `grep <classe> .next/static/css/app/layout.css`
   → só depois commit. **Não** edit → commit → esperar reclamação.
3. **Riscos no topo, não no rodapé** — qualquer instrução que toca infra
   compartilhada (DB, portas, schemas, secrets) começa com **"Antes de
   executar"** listando riscos.
4. **Parar após 1 falha do mesmo tipo** — não iterar 3x na mesma hipótese.
   Voltar pra config/docs do tooling.

---

## Estado dos serviços

| Serviço | Porta | Status |
|---|---|---|
| Postgres docker | 5433 | up (healthy) |
| Redis docker | 6379 | up (healthy) |
| Backend worktree | 3000 | iniciar manualmente |
| Frontend worktree | 3002 | iniciar manualmente |
| Backend main | 3000 | **não pode rodar junto** com worktree |
| Frontend main | 3001 | independente, pode coexistir |

---

## Decisão de merge

Branch fica vivo até completar:
1. Validação visual end-to-end OK.
2. CORS/hotlink R2 configurado.
3. Categorias seedeadas (mínimo 1).

Depois disso, merge atômico `feat/video-player-skin` → `main`. Cleanup:
```bash
git worktree remove .worktrees/video-player-skin
```
