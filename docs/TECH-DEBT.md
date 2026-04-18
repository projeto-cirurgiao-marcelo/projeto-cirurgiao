# Technical debt — Projeto Cirurgião

Running list of debt items the current sprint consciously did not
tackle. Each entry should include: why we skipped it, what the blast
radius is, and the concrete step to close it. If you add something
here, link the commit / PR / audit doc that surfaced it.

---

## SECURITY-CRITICAL — Ações obrigatórias no go-live

Credenciais reais comitadas no repo desde o initial commit (~6 meses).
Risco aceito durante o sprint porque repo é privado, colaboradores são
conhecidos, e zero usuários reais em prod. **Rotação mandatória antes
de qualquer release público.**

Política de sprint, decidida em conjunto com Gustav: **ninguém toca em
`.env.example` nem em `backend-api/.env.proxy.example` durante o sprint.**
A rotação é um evento de go-live, não de feature branch.

### 1. Senha `app_cirurgiao` (PostgreSQL, Cloud SQL `cirurgiao-db`)

- Localização: `backend-api/.env.proxy.example`
- Exposição: valor em plaintext no arquivo committed; histórico git
  completo desde o initial commit.
- Ação go-live:
  1. `gcloud sql users set-password app_cirurgiao \
        --instance=cirurgiao-db --password='<nova_senha>'`
  2. `echo -n '<nova_senha>' | gcloud secrets versions add \
        cirurgiao-db-password --data-file=-`
  3. Cloud Run pega automático no próximo deploy (secret já está
     wireado via `DATABASE_URL` em `docs/DEPLOY.md §1`).
  4. Substituir valor em `.env.proxy.example` por placeholder
     (`postgresql://app_cirurgiao:<ROTATE_ME>@…`).

### 2. Token Cloudflare API (Stream + R2, escopo amplo)

- Localização: `.env.example` (raiz do repo), linhas 34-35.
- Valores atuais comitados:
  - `CLOUDFLARE_ACCOUNT_ID` (40 chars)
  - `CLOUDFLARE_API_TOKEN` (40 chars — escopo amplo herdado)
- Ação go-live:
  1. `dash.cloudflare.com` → My Profile → API Tokens → revogar token
     atual + criar um novo com escopo mínimo:
     - Stream: Read/Edit
     - R2 Object: Read/Write só no bucket `s3-projeto-cirurgiao`
     - Nada mais.
  2. `gcloud secrets versions add cloudflare-api-token --data-file=-`
  3. `gcloud secrets versions add cloudflare-account-id --data-file=-`
  4. Redeploy Cloud Run.
  5. Substituir valores em `.env.example` por placeholders:

     ```
     CLOUDFLARE_ACCOUNT_ID="<your_cloudflare_account_id>"
     CLOUDFLARE_API_TOKEN="<your_cloudflare_api_token>"
     ```

### 3. Pós-rotação: `git filter-repo`

Depois das duas rotações confirmadas em produção:

```
git filter-repo --path backend-api/.env.proxy.example --invert-paths
git filter-repo --path .env.example --invert-paths
```

(Pode ser combinado num single pass passando os dois `--path`.)

Coordenar force-push com todos os devs que tenham clone local.
Notificar integrações downstream (CI, mirrors se houver).

Cross-reference: o procedimento completo de `git filter-repo` também
está em `docs/DEPLOY.md §5 "Post-rotation cleanup"` para a senha
`app_cirurgiao`. Esta seção aqui é o checklist consolidado — se
divergirem, **DEPLOY.md §5 é a fonte de verdade operacional**; esta
entrada existe pra que o go-live checklist do Gustav veja ambas as
credenciais lado a lado.

---

## Próximo sprint — Web (T7.1)

A (web) auditou fluxos que precisam de skeletons/loading states mas
não entraram no sprint atual. Escopo completo em:
`frontend-web/docs/proposals/t7-loading-audit.md` (track/front-web).

Principais gaps:
- Forum listagens (`/student/forum`, `/student/forum/[categoryId]`)
- Library chat (`/student/library`)
- Curso detalhe (`/student/courses/[id]`)
- Forum reply/topic submit feedbacks
- Gamification listings

Prioridade: média (UX). Estimativa: 4-6h.
