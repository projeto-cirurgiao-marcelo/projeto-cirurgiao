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

## Arquitetura — débitos anteriores ao sprint

Itens identificados durante o sprint v1.0 mas originados antes dele. Não
foram introduzidos por nenhum dos 3 tracks; são dívida arquitetural
pré-existente. Alvo de remediação fora do escopo v1.0.

### Autenticação híbrida Firebase + JWT

**Descoberto durante smoke test do sprint v1.0 (2026-04-18).**

Vários endpoints do backend usam `FirebaseAuthGuard` pra validar o
`Authorization: Bearer <token>` header em vez do `JwtAuthGuard` próprio
que valida o token emitido por `POST /auth/login`. Na prática:

- Cliente faz `POST /auth/login` → recebe `accessToken` (JWT nosso).
- Cliente tenta `GET /api/v1/courses` com esse JWT → **401** porque esse
  endpoint exige Firebase ID token, não JWT.
- Funciona via frontend porque o Firebase Web SDK emite ID token
  automaticamente, e `apiClient` injeta ele no header.

Impacto:
- **Smoke test via curl direto é complicado**: cada endpoint tem guard
  diferente, e pra endpoints com `FirebaseAuthGuard` precisamos de
  Firebase ID token (obtido via Firebase SDK client-side), não do JWT
  do `/auth/login`.
- Documentação de API fica ambígua — não dá pra dizer "envie o Bearer
  do /auth/login" pra todos os endpoints.
- Refresh flow fica duplicado (refresh do JWT próprio + renovação do
  Firebase ID token).

Plano (próximo sprint):
1. Auditar cada controller e listar qual guard está em uso.
2. Decidir: migrar tudo pra `JwtAuthGuard` OU tudo pra `FirebaseAuthGuard`
   consistente. A escolha depende de:
   - Se queremos manter suporte a login email/senha sem Firebase → ficar
     com `JwtAuthGuard` (gera próprio JWT após validar Firebase ID).
   - Se Firebase é a fonte de verdade → consolidar em `FirebaseAuthGuard`
     e deprecar `/auth/login` (virar `/auth/firebase-login` apenas).
3. Migration path gradual (feature flag por controller?) ou big-bang?
4. Atualizar `apiClient` do web e mobile pra usar o token correto em
   todas as requests.
5. Smoke test pós-migração confirma que curl direto com único tipo de
   token funciona em todos os endpoints.

Owner: próximo sprint, track backend (C). Estimativa: 2-3 dias
(auditoria + migração + smoke). **Não é bloqueador go-live** porque
frontend funciona hoje — é dívida de developer-experience e
documentação.

**Workaround pra smoke test no go-live (sprint v1.0):**

Usar Firebase ID token (obtido via frontend real ou via script
helper) em vez do JWT do `/auth/login` pra testes via curl. Exemplo:

```bash
# No web (DevTools console), logado:
await firebase.auth().currentUser.getIdToken()
# ou no mobile, com o user logado:
await firebase.auth().currentUser.getIdToken()
```

Copiar esse token e usar como `Authorization: Bearer <token>` em curl.
**Alternativa recomendada pro go-live**: rodar smoke test direto pela
UI (web + mobile), não via curl — simula melhor a experiência real
de usuário e evita esse gotcha.

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
