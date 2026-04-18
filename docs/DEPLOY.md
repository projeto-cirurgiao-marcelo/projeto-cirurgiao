# DEPLOY — frontend-web

Checklist operacional de deploy do `frontend-web/` (Next.js 15 + React
19). Host: Vercel / Firebase Hosting.

## §1 Build local

```bash
cd frontend-web
npm ci
npm run build
```

Build deve completar sem erros. Warnings pré-existentes documentados
em `docs/TECH-DEBT.md` (framer-motion peer dep, video.js plugin).

## §2 Variáveis de ambiente

Configurar em Vercel / Firebase Hosting:

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
anterior. Firebase Hosting: `firebase hosting:clone` entre canais.

## §6 GO-LIVE CHECKLIST

Antes de liberar domínio de produção pra usuários reais:

- [ ] `npm install next@<latest patch>` e `npm install react@<latest patch> react-dom@<latest patch>` (ver TECH-DEBT.md seção SECURITY pra versões específicas)
- [ ] `npm run build` sem erros
- [ ] Testar fluxos críticos (login, watch, quiz, chat IA) em staging
- [ ] (adicionar mais conforme o sprint progride)
