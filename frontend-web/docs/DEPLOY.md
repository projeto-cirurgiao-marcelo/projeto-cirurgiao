# DEPLOY — frontend-web

Checklist operacional de deploy do `frontend-web/` (Next.js 15 + React 19).

## §0 Plataforma canônica: **Vercel**

O `frontend-web` é servido **exclusivamente pela Vercel**. É Next 15 App Router
com middleware edge e renderização dinâmica (SSR) — só a Vercel serve isso
corretamente (`vercel.json` declara `framework: nextjs`, região `gru1`).

**Firebase Hosting é legado.** A antiga config servia `frontend-web/out` (um
`next export` estático), mas o projeto **não** é `output: 'export'` e nunca gera
`out/` — logo aquilo estava morto. Para evitar servir uma versão divergente,
`firebase.json` agora **redireciona 301** todo o tráfego para
`https://app.projetocirurgiao.app` (domínio canônico Vercel).

> ⚠️ **Não publicar o web em duas plataformas.** Nunca reativar Firebase Hosting
> para servir o app — isso recria o risco de versões independentes em produção.
> O projeto Firebase (`projeto-cirurgiao-e8df7`) segue em uso **apenas** para
> Auth (Web SDK), não para hosting.

Domínios: `app.projetocirurgiao.app` = app (Vercel); `projetocirurgiao.app` /
`www` = marketing.

## §1 Build local

```bash
cd frontend-web
npm ci
npm run build
```

Build deve completar sem erros. Warnings pré-existentes documentados
em `docs/TECH-DEBT.md` (framer-motion peer dep, video.js plugin).

## §2 Variáveis de ambiente

Configurar na Vercel (Project Settings > Environment Variables):

- `NEXT_PUBLIC_API_URL` — URL do backend em produção (Cloud Run).
- `NEXT_PUBLIC_FIREBASE_*` — config do Firebase Web SDK (auth).
- `NEXT_PUBLIC_DEBUG` — **deixar unset em prod**. Apenas ligar (`true`)
  temporariamente em staging pra debug.

## §3 Preview deploy

Cada PR gera preview no Vercel. Validar antes de merge:

- Login funciona com conta de teste.
- Dashboard carrega sem tela branca.
- Player de vídeo carrega stream.

## §4 Deploy produção

Merge em `main` dispara deploy automático. Após deploy:

- Checar `/` e `/login` respondem 200.
- Smoke-test manual: login, abrir curso, dar play em vídeo.

## §5 Rollback

Vercel: usar painel "Deployments" > "Promote to Production" no deploy
anterior (Instant Rollback). Firebase Hosting **não é rota de rollback** —
está desativado como host (só redirect); ver §0.

## §6 GO-LIVE CHECKLIST

Antes de liberar domínio de produção pra usuários reais. Ver
`docs/TECH-DEBT.md` seção **SECURITY-CRITICAL** pra lista de CVEs
e rationale de cada upgrade.

### Pre-release dependency upgrade (CVE remediation)

**Web** (executado neste worktree):

- [ ] `cd frontend-web && npm install next@15.3.8 react@19.2.1 react-dom@19.2.1 axios@1.16.0`
- [ ] `npm audit fix --omit=dev` — resolve transitivas
  (protobufjs, follow-redirects, @xmldom/xmldom)
- [ ] `npm run build` — validar sem erros
- [ ] `npm test` — unit tests (waitForJob) passando
- [ ] `npx playwright test` — 3 jornadas e2e passando
- [ ] Testar fluxos críticos em staging manualmente (login, watch,
  quiz, chat IA, onboarding)

**Mobile** (executado no worktree `track/front-mobile`):

- [ ] `cd mobile-app && npm install axios@1.16.0`
- [ ] `npm audit fix --omit=dev`
- [ ] Rebuild EAS preview + testar em device real (iPhone Gustav +
  Android emulator)
- [ ] Rebuild EAS production

### Outros itens

- [ ] Backend com Secret Manager wired (ver
  `backend-api/docs/DEPLOY.md §4 "Wiring secrets into Cloud Run"`)
- [ ] Backend `QUEUE_ENABLED`: decidir on/off no go-live. Frontend
  já suporta ambos modos via `waitForJob` transparente.
- [ ] Staging seed aplicado pelo menos 1x (garantia de que
  migrations rodaram em prod) — `cd backend-api && npx ts-node
  prisma/seed-staging.ts` contra staging DB.
- [ ] CORS backend aberto pro domínio final de produção.
