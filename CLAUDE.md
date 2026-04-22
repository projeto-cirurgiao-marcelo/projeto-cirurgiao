# Projeto Cirurgião — Contexto do Agent Team

## O que é
SaaS de educação em cirurgia veterinária. Três apps no mesmo repo:
- `backend-api/` — NestJS 10 + Prisma 5 + PostgreSQL (Cloud SQL) + Vertex AI
- `frontend-web/` — Next.js 15 + React 19 + shadcn/ui + Tailwind v4
- `mobile-app/` — Expo SDK 54 + React Native 0.81 + Expo Router v6 + NativeWind v5

Deploy: Cloud Run (`southamerica-east1`). Hosting web: Firebase + Vercel.
Monorepo manual (sem workspaces); scripts na raiz só fazem `cd`.

## Decisões fechadas
- **Layout web oficial:** `(dashboard)/` — `(platform)/` é redesign Coursera-like abandonado, **deve ser removido inteiro**. Inclui rotas duplicadas tipo `/admin/courses-new` (listagem alternativa, não confundir com `/admin/courses/new` que é a criação oficial em `(dashboard)/`).
- **Auth store oficial:** `auth-store.ts`. Remover `auth-store-firebase.ts` e migrar imports.
- **`TranscriptsModule`:** remover de vez (feature descartada).
- **`VideoTranscriptManager`:** remover de vez (feature descartada).
- **Cloudflare Stream:** manter como `videoSource` válida até migração R2 100% concluída.
- **Juice Lab:** branch `feat/mobile-juice-lab` segue em desenvolvimento paralelo, NÃO mexer.
- **Credenciais:** migrar pra Secret Manager. Rotação efetiva fica pro go-live.

## Pipeline de migração de vídeo (externo ao team)
~150 vídeos sendo processados por script bash externo na máquina do Gustav:
- FFmpeg + NVENC → HLS multi-bitrate
- Faster-Whisper large-v3 local → VTT pt-BR
- Upload R2 com content-type correto

Resultado fica em `s3-projeto-cirurgiao/videos/<path>/<basename>/playlist.m3u8`.
O agent team **não toca nesse pipeline** — só garante que o backend e os 
players consumam corretamente quando `videoSource=r2_hls`.

Player web já adaptado (`hls-video-player.tsx`).
Player mobile já adaptado (`expo-video` em `VideoPlayer.tsx`).

## Convenções do código
- Backend: TypeScript, NestJS modules por domínio, Prisma schema em 
  `backend-api/prisma/schema.prisma`. `strictNullChecks: false` hoje — 
  uma das metas é mudar pra `true`.
- Web: App Router, `'use client'` no que precisa, services em 
  `src/lib/api/*.service.ts` (axios, não TanStack Query).
- Mobile: Expo Router file-based, componentes em `mobile-app/src/components/`, 
  services em `mobile-app/src/services/api/`.
- Estado em Zustand + persist nos dois frontends.
- Auth: JWT (access 15min / refresh 7d) + Firebase ID token.

## Pipeline de vídeo no código
- 5 fontes em `Video.videoSource`: `cloudflare`, `youtube`, `vimeo`, `external`, `r2_hls`.
- Cloudflare Stream = legado em descontinuação; R2 HLS = destino final.
- Legendas no fluxo Cloudflare: `CloudflareStreamService.generateCaptions()` → VTT em R2.
- Legendas no fluxo R2: já vêm prontas do pipeline externo (`subtitles_pt.vtt` 
  + `subtitles.m3u8` referenciados no master playlist).

## Regras pros teammates
1. **Nunca commitar segredos.** Se encontrar credencial hardcoded, flagueia e não commita.
2. **Rodar Prisma generate** (`cd backend-api && npx prisma generate`) após qualquer mudança de schema.
3. **Antes de mudar contrato de API**, avisar via mensagem pro time.
4. **Não mexer no worktree dos outros.** Cada track tem seu próprio diretório.
5. **Não mexer na branch `feat/mobile-juice-lab`** — segue paralela ao sprint.
6. **Commits pequenos e descritivos.** Padrão: `feat(área): descrição`, `fix(área): descrição`, `chore(área): descrição`.
7. **Console.log:** remover ou converter em logger dedicado antes de marcar tarefa como pronta.
8. **Testes:** meta do sprint é cobertura mínima, não 100%. Cada teammate cobre sua camada.

## Comandos frequentes
```bash
# Backend local
cd backend-api && docker-compose up -d && npm run start:dev

# Prisma
cd backend-api && npx prisma migrate dev && npx prisma generate

# Web
cd frontend-web && npm run dev

# Mobile
cd mobile-app && npm start
```

## Débito técnico consciente
- `KnowledgeChunk.embedding` em JSON (alvo: pgvector, track backend).
- Nenhum teste automatizado hoje — meta é cobertura mínima até fim do sprint.
- `strictNullChecks: false` no backend — meta é ligar e corrigir fallout.
````

---