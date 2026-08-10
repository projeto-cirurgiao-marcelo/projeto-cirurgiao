# Review Pré-Live — 2026-08-06

> **🔄 Atualização 2026-08-10 — execução dos findings (sessão com Gustavo):**
> - **R3 ✅ RESOLVIDO** — `app.projetocirurgiao.app` adicionado ao projeto Vercel + CNAME no Cloudflare (DNS only). Verificado ao vivo: DNS autoritativo OK, HTTPS 200, security headers completos, app servido. Apex `projetocirurgiao.app` segue sem registro DNS (cosmético, 307→www já configurado na Vercel; registro `A @ 76.76.21.21` quando quiser).
> - **R1 ✅ MITIGADO (commit)** — `docs/cademi-api/` adicionado ao `.gitignore` (EAS já cobria via `docs/`). Credenciais seguem válidas em disco; **rotação descartada por decisão do Gustavo (2026-08-10)** — risco aceito.
> - **R2 ⚠️ RISCO ACEITO** — rotação da senha do Postgres descartada por decisão do Gustavo (2026-08-10). Senha segue no histórico git; reavaliação obrigatória antes de adicionar colaboradores ao repo ou torná-lo público.
> - **A1 ✅ MITIGADO POR CONFIG** — verificado no console Firebase (prints em sessão): inscrição estava ATIVA com E-mail/senha + Google habilitados = vetor explorável confirmado. **Gustavo desativou "Ativar criação (inscrição)"** (2026-08-10); vinculação já estava em "Vincular contas que usam o mesmo e-mail" (correto). Criação de conta via API pública bloqueada; fluxo de convite (Admin SDK) não é afetado. **⚠️ CONDIÇÃO FUTURA: antes de reativar a inscrição (registro público pós-V1), o fix de código é obrigatório** — `firebaseUid @unique` no modelo User + guard resolvendo por UID (fallback por e-mail só com `email_verified`).
> - **M10 ⬇️ rebaixado a cosmético** — com a inscrição desativada, a tela "Criar conta" do app falha no servidor; esconder o fluxo vira ajuste de UX, não segurança.
> - **Smoke em device físico:** descartado por decisão do Gustavo (sem aparelho disponível).

> **Natureza:** review read-only de código, configuração e produção (sondas HTTP). Nenhum fix aplicado, nenhum deploy, nenhum dado criado em prod. Nenhum valor de segredo aparece neste documento — apenas nomes e localizações.
>
> **Método:** 4 subagentes de escopo fechado (backend, web, mobile, varredura transversal de segredos) + sondas em produção + smoke automatizado em emulador Android (build debug local `expo run:android`). Findings consolidados e deduplicados pelo agente principal.
>
> **Leitor-alvo:** Gustavo — este doc é insumo de decisão, não plano de execução.

---

## 1. Sumário executivo

| Plataforma | Veredicto | Justificativa em uma linha |
|---|---|---|
| **Backend/API** | 🟡 **GO com condições** | Hardening P1.9/P1.10/P1.13/P1.15 confirmado em código E em runtime; condições: rotação da senha de banco exposta, verificação do console Firebase (finding A2) e bump de dependências não-major. |
| **Web** | 🟡 **GO com condições** | Headers/CSP/middleware corretos e validados ao vivo; condição dura: resolver o DNS do domínio canônico (finding A1) e bump de Next/axios. |
| **Mobile iOS** | 🟡 **GO com condições** | P0.5/P0.6 confirmados no código, suíte verde (17/66); condições: Sentry DSN nos builds EAS e proteger o caminho da chave do Play/submit config. Re-smoke em device físico segue pendente (fora deste review). |
| **Mobile Android (lojas)** | 🔴 **NO-GO por ora** | Boot em emulador **passou** (§5), mas: sem validação em device físico, submit config quebrada, decisão de `applicationId` ainda aberta (última janela antes do 1º upload). |
| **Transversal (segredos)** | 🔴 **Condição dura para qualquer abertura ampla** | 3 bloqueadores ativos: credenciais R2+Cademí commitáveis em `docs/cademi-api/`, senha do Postgres de prod no histórico git, e o risco aceito P0.2-B não se sustenta mais como estava (ver §3). |

**Leitura recomendada:** para o cohort fechado atual (18 alunos), nada encontrado é regressão de runtime — o produto está no ar e endurecido. Para **abertura pública ampla**, os 🔴 abaixo são pré-requisito.

---

## 2. Findings

### 🔴 Bloqueadores de live

**R1. Credenciais vivas de produção em `docs/cademi-api/` — untracked e FORA do .gitignore**
- **Evidência:** `docs/cademi-api/_list_r2.py:13-14` (par de chaves R2 literal: access key ~32 chars, secret ~64 chars; endpoint com account ID e bucket `s3-projeto-cirurgiao` em `:11-12`); `docs/cademi-api/_extract.py:11` (token da API Cademí ~35 chars, usado no header em `:14`). Nenhum script do diretório usa env var. `git check-ignore` confirma que o diretório **não** é ignorado.
- **Impacto:** acesso R/W total ao bucket de vídeos e à API do LMS de origem. Um `git add docs/` ou `git add .` distraído publica tudo. É a mesma classe do incidente EAS de 04/08 — só que agora a um comando de distância do repositório.
- **Correção sugerida:** rotacionar o par R2 no Cloudflare e o token na Cademí; mover o diretório para fora da árvore (padrão `D:\dashboard\_local-nao-versionado\`) ou adicionar `docs/cademi-api/` ao `.gitignore` raiz; reescrever os scripts para `os.environ`.

**R2. Senha do usuário de banco de produção VERSIONADA no histórico git**
- **Evidência:** `docs/HANDOFF-2026-05-09-prod-stabilization.md:182` e `:185` — duas connection strings `postgresql://app_cirurgiao:<senha>@…` com a senha em claro (8 chars, numérica). Arquivo tracked; entrou no commit `24a77de`. Débito já registrado em `docs/TECH-DEBT.md:34` e `docs/sprint-v1.0/07-go-live-checklist.md`, ainda aberto.
- **Impacto:** credencial do Cloud SQL de prod acessível a qualquer pessoa com acesso ao repo (hoje privado — mas colaboradores futuros, forks, vazamento de repo = banco). Remover o arquivo agora **não** resolve; a senha está no histórico.
- **Correção sugerida:** `gcloud sql users set-password` + atualizar o segredo no Cloud Run (janela atômica, procedimento do P0.2-B), **antes** de qualquer abertura ampla. Limpeza de histórico (filter-repo/BFG) é secundária à rotação.

**R3. Domínio canônico `app.projetocirurgiao.app` sem registro DNS (NXDOMAIN)**
- **Evidência:** verificado ao vivo em 2026-08-06 contra o DNS autoritativo (Cloudflare, via DoH): `app.projetocirurgiao.app` → **NXDOMAIN** (A, AAAA e CNAME); apex `projetocirurgiao.app` → sem registro A (não responde, code 000); `www.projetocirurgiao.app` → CNAME Vercel, **serve o app** com todos os security headers. `frontend-web/docs/DEPLOY.md §0` declara `app.` como canônico e `firebase.json` faz redirect 301 **para ele** (P1.14).
- **Impacto:** todo link/bookmark/material que use o domínio canônico documentado quebra com erro de DNS; o redirect do Firebase aponta para o vazio; a documentação de deploy e o runbook de rollback referenciam um host morto. Se os alunos usam `www.`, o produto funciona — mas a divergência doc×realidade vai morder exatamente durante um incidente.
- **Correção sugerida:** verificação de minutos no painel (Cloudflare DNS + Vercel Domains): ou recriar o registro `app.` (CNAME para Vercel) ou assumir `www.` como canônico e corrigir DEPLOY.md, firebase.json e runbooks. Decisão explícita antes do live.

### 🟠 Altos (corrigir antes do público amplo)

**A1. Auth do backend vincula identidade só por e-mail — sem `firebaseUid`, sem checar `email_verified`**
- **Evidência:** `backend-api/src/modules/firebase/guards/firebase-auth.guard.ts:44-56` — lookup por `findFirst({ where: { OR: [{ email: decodedToken.email }] } })`, com a linha de vínculo por UID **comentada**; modelo `User` sem campo `firebaseUid`; `email_verified` copiado (`:71`) mas nunca exigido (contas criadas pelo admin nascem `emailVerified: false` — `firebase-admin.service.ts:145`).
- **Impacto:** a identidade é "o e-mail dentro de um ID token". Qualquer `User` do Postgres cujo e-mail ainda não exista no projeto Firebase pode ser tomado por quem criar uma conta Firebase com aquele e-mail (a API key web é pública) — herdando o role, inclusive ADMIN. A proteção atual é o efeito colateral de o e-mail já estar tomado no Firebase.
- **Severidade real depende de 2 verificações de minutos no console Firebase** (não executáveis neste review): signup e-mail/senha aberto? proteção "uma conta por e-mail" ativa para provedores federados? Se o signup estiver aberto, **isto sobe para 🔴**.
- **Correção sugerida:** `firebaseUid String? @unique` no modelo User, popular no register/primeiro login, guard resolve por UID com fallback por e-mail apenas quando `email_verified === true`; auditar quais Users de prod não têm conta Firebase correspondente (é o conjunto exposto).

**A2. Risco aceito P0.2-B (rotação de segredos) não se sustenta mais — ver §3**
- As mesmas chaves R2 dos handoffs locais aceitos em P0.9 agora também estão em `docs/cademi-api/` (R1) e já estiveram num tarball EAS (incidente 04/08). `video-pipeline/HANDOFF.md:59` e `video-pipeline/cloudflare-worker/handoff.md:59` mantêm R2 access/secret + `WEBHOOK_SECRET` em claro (locais, gitignored — mas é o tipo de arquivo que já vazou). Rotação de R2 + WEBHOOK + senha DB (R2 finding) + chave SA GCP (incidente EAS) deixa de ser "pré-abertura ampla" e vira **condição de GO**.

**A3. `.history/` guarda snapshots com chave privada do Firebase Admin e env de prod**
- **Evidência:** `.history/backend-api/firebase-service-account_2026*.json` (4 cópias com `BEGIN PRIVATE KEY`) e `.history/backend-api/cloud-run-env_2026*.yaml` (DATABASE_URL com senha, JWT secrets, tokens). Tudo gitignored e fora do tarball EAS (regras corretas) — risco é local: qualquer zip/backup/upload da pasta vaza credenciais "já sanitizadas" dos arquivos atuais.
- **Correção sugerida:** apagar `.history/backend-api/` (não fiz — mandato read-only).

**A4. Caminho da chave do Play Console desprotegido nas duas camadas (preventivo)**
- **Evidência:** `mobile-app/eas.json:56` aponta `./playstore-service-account.json`; `.easignore:42` tem `*-service-account*.json` mas `.easignore:92` (`!mobile-app/**`) vem depois e re-inclui; `git check-ignore mobile-app/playstore-service-account.json` → não ignorado. O arquivo ainda não existe.
- **Impacto:** no dia em que a chave for colocada onde o próprio `eas.json` manda, ela fica commitável **e** sobe pros servidores da Expo em todo build — reedição exata do incidente de 04/08.
- **Correção sugerida:** re-excluir `mobile-app/*-service-account*.json` no `.easignore` (após a linha 92) + mesma entrada em `mobile-app/.gitignore`; preferir EAS secret / caminho fora do repo no submit.

**A5. Dependências com CVE HIGH/CRITICAL e fix não-major disponível**
- **Web:** `next@15.3.8` → 15.5.23 corrige, entre outros, **bypass de middleware via segment-prefetch** (o middleware é o gate de `/admin` e `/student`), cache poisoning RSC e SSRF em rewrites. `axios@1.15.2` → HIGH (ReDoS, prototype pollution).
- **Backend:** `npm audit --omit=dev` = 1 CRITICAL + 12 HIGH. Diretas com fix sem major: `axios` (MITM via prototype pollution em config.proxy, CVSS 8.7 — relevante: backend chama Cloudflare/R2/Vertex), `form-data`, `websocket-driver` (a CRITICAL, transitiva). Major (Nest 10→11, firebase-admin 14, sharp) fica pós-live.
- **Mobile:** 3 critical/6 high, **nenhuma direta e nenhuma no bundle RN** (caminho Node do SDK Firebase / toolchain Metro) — sem urgência; `npm audit fix` sem `--force` (o `--force` puxaria expo@57, breaking).
- **Correção sugerida:** rodada única de bumps não-major (next, axios web+backend, form-data, websocket-driver) + build + smoke antes do deploy.

**A6. Sentry do mobile provavelmente sobe desligado nos builds EAS**
- **Evidência:** `mobile-app/src/config/sentry.ts:24-31` — `initSentry()` retorna false sem `EXPO_PUBLIC_SENTRY_DSN`; nenhum dos 3 perfis do `eas.json` define a variável (não foi possível checar `eas env:list` — exige login).
- **Impacto:** app em produção sem captura de crash — era item do done criteria do go-live (P1.2 mobile).
- **Correção sugerida:** `eas env:list --environment production`; se ausente, criar como env var do projeto EAS.

**A7. Secret Manager pode estar mascarado por env vars plaintext no Cloud Run**
- **Evidência:** `backend-api/src/config/secrets/secrets-loader.ts:113-116` — env var já definida tem precedência e o segredo é `skipped` sem log discriminado (`:146` só agrega contagens). Não foi possível confirmar o estado real da revisão (gcloud com auth expirado — `invalid_rapt`).
- **Impacto:** se sobraram env vars diretas do cutover P0.8, o Secret Manager nunca é consultado e a rotação P0.2-B **não teria efeito** nos serviços — a migração pareceria feita sem estar.
- **Correção sugerida:** conferir na revisão atual do Cloud Run se as variáveis de `DEFAULT_SECRET_MAPPINGS` (`secrets-loader.ts:33-46`) ainda existem como env var direta e removê-las; logar nomes (nunca valores) da lista `skipped` em produção.

### 🟡 Médios (primeira semana)

**M1. Paridade quebrada nos helpers de progresso — mobile decide "concluído" pelo ponderado**
- `frontend-web/src/lib/course-progress.ts` expõe weighted (`:30`) e binário (`:60`, com `Math.round` + clamp 0-100); `mobile-app/src/lib/course-progress.ts:17` só tem weighted-first, sem round/clamp. Consumo divergente: `mobile-app/app/(tabs)/index.tsx:106` e `app/courses/in-progress.tsx:51` filtram "em andamento" com weighted < 100, web usa binário (`student/my-courses/page.tsx:148-156`). Aluno que assistiu tudo sem marcar concluído: some do "Continue assistindo" no mobile, continua "em andamento" na web. Correção: portar as duas funções do web pro mobile e usar a binária nos filtros.

**M2. Refresh tokens em texto puro no banco + rotação sem detecção de reuso**
- `backend-api/src/modules/auth/auth.service.ts:371-375` (create com token em claro; consulta por igualdade em `:104-105`); rotação existe (`:120-126`) mas replay de token já revogado só lança erro — não revoga a família nem audita. Correção: armazenar `sha256(token)`; ao ver `isRevoked === true`, `updateMany` revogando todos do userId + evento no AuditService.

**M3. Health check responde em `/api/v1/health`, não `/health`**
- `setGlobalPrefix('api/v1')` sem `exclude` (`main.ts:63`). Confirmei em prod: `/api/v1/health` = 200, `/health` = 404. Risco de monitor/probe apontando pro path errado. Correção: `exclude: ['health']` ou documentar o path canônico no runbook.

**M4. Env vars públicas do r2-browser sem documentação e com fallback silencioso**
- `frontend-web/src/lib/api/r2-browser.service.ts:10-18` e `multipart-uploader.ts:11-14`: `NEXT_PUBLIC_R2_BROWSER_WORKER_URL || 'http://localhost:8787'` — se a var faltar na Vercel, o admin quebra com erro de CSP (esquema http bloqueado) sem mensagem útil. Var não listada no `DEPLOY.md §2`. Correção: documentar + confirmar no painel Vercel + trocar fallback por throw em prod.

**M5. Loggers imprimem AxiosError inteiro com Bearer token em erro**
- Mobile: `src/lib/logger.ts:38-41` (error/warn passam em release) + services logando o AxiosError completo (ex.: `quizzes.service.ts:126`) → ID token no logcat do device. Web: `lib/logger.ts:30-33` + `auth-store.ts:169/230/304` → token no console do navegador em falha de login. O caminho Sentry já rediga (`sentry.ts:44-51`); o console não. Correção: logar só `message` + `response.status` (ou aplicar o mesmo scrub do Sentry).

**M6. `eas submit` de produção quebrado por config**
- `eas.json:56` aponta arquivo inexistente; `:60-62` com placeholders `CONFIGURAR_VIA_EAS_SECRETS` nos campos Apple. Não afeta `eas build`. Resolver junto com A4.

**M7. Identificadores divergentes iOS×Android — última janela de decisão**
- iOS `app.projetocirurgiao.mobile` vs Android `com.projetocirurgiao.app` (`mobile-app/app.json:12/:24`), cada um coerente com seu arquivo Firebase — nada quebra. Mas o `applicationId` Android é imutável após o 1º upload na Play Console. Decidir (e documentar) antes.

**M8. Arquivos `.sql` manuais soltos em `prisma/migrations/`**
- `add_generation_count_to_summaries.sql`, `manual_create_chatbot_tables.sql`, `manual_create_video_summaries.sql` na raiz da pasta — `migrate deploy` os ignora; registram alterações aplicadas à mão. Sem drift hoje (schema×migrations conferido, 45 modelos × 44 migrations). Mover para `prisma/manual/` com README.

**M10. App mobile expõe registro público apesar da política convite-only** *(achado do smoke — detalhe em §5)*
- Tela de login → "Criar conta" abre formulário completo de registro. Verificar se o endpoint de registro está bloqueado em prod; esconder o fluxo enquanto o acesso for por convite. Combina com A1.

**M9. Higiene de gitignore/exemplos**
- `mobile-app/.env.production` e `*.keystore` não são cobertos pelos gitignores atuais; `.env.local.example` (versionado) contém valores reais do Firebase web (públicos por design, mas treinam hábito errado); `docs/cademi-api/` inteiro fora do gitignore (junto com R1); `.agent-bus/` fora do gitignore (conteúdo limpo); `app.json` espúrio na raiz (`{"expo": {}}`, 16 bytes, untracked) — deletar: qualquer `expo`/`eas` rodado por engano na raiz lê config vazia, e o arquivo entra no tarball EAS.

### 🟢 Baixos / registro

- Cookie `auth-session` sem flag `Secure` (conteúdo é só role UX; Vercel é HTTPS-only) — `auth-store.ts:166/226`, `auth-provider.tsx:53`.
- CSP sem `form-action 'self'`; `connect-src https:` amplo — só relevantes sob XSS, e os 5 `dangerouslySetInnerHTML` foram auditados (todos passam por `formatMarkdown` com escape prévio de `&<>` — é o que mantém o débito `unsafe-inline` tolerável).
- `loginWithGoogle` é código morto e colidiria com `frame-src` da CSP se ativado (`auth.service.ts:122-139`).
- Backend: log do comprimento do token Cloudflare (`cloudflare-stream.service.ts:95`); catch silencioso de gamificação (`ai-summaries.service.ts:230`); `RolesGuard` sem null-check (`roles.guard.ts:21-22` — hoje inofensivo, todos os controllers têm FirebaseAuthGuard a montante); e-mails de alunos em logs de falha de auth (PII nos logs do Cloud Run).
- Mobile: peer dep inválida do NativeWind preview (mitigada por `.npmrc` legacy-peer-deps + lockfile); `channel` nos perfis EAS sem `expo-updates` instalado (não há OTA — correção pós-live exige build+submit novos); `SENTRY_DISABLE_AUTO_UPLOAD=true` também em production (stack traces minificados — coerente com escopo atual).
- IP público do Cloud SQL em doc versionado (`knowledge/PROJECT_DOCUMENTATION.md:1426`, senha é placeholder) — reconhecimento facilitado; relevante combinado com R2.
- `.playwright-mcp/` (logs de browser): zero tokens, 1 e-mail do próprio dono; já ignorado.
- Logos untracked (`logobranca.svg`, `docs/novas logos/`): SVGs limpos (sem script/refs externas); versionar é decisão editorial.
- `docs/ONBOARDING-CONTINUACAO-2026-06-14.md` e `RUNBOOK-CONTINUIDADE-2026-06-14.md`: **limpos** (só nomes de variáveis, zero valores) — candidatos legítimos a commit.

---

## 3. Riscos aceitos — reavaliação

| Risco aceito (origem) | Mantém-se aceitável? | Motivo |
|---|---|---|
| **P0.2-B — rotação de secrets adiada** (Gustavo, go-live controlado) | ❌ **NÃO como está** | O contexto mudou três vezes desde a aceitação: (1) incidente EAS de 04/08 expôs chave SA GCP + dump de prod; (2) este review achou as mesmas chaves R2 em `docs/cademi-api/` **commitáveis** (R1); (3) senha do Postgres de prod está no histórico git (R2). **Rotação de R2 + WEBHOOK_SECRET + senha Postgres + SA GCP passa a ser condição de GO para abertura ampla.** JWT secrets por último (invalida sessões), como já planejado. |
| **Android fora do escopo** (go-live iOS-only 2026-07-02) | ⚠️ Parcial | Segue aceitável **enquanto Android não for distribuído**. Mas o trabalho de paridade Android está em curso; os gaps A4/M6/M7 devem fechar **antes** do 1º upload na Play (o applicationId trava para sempre). |
| **`handoff.md` local com valores** (P0.9, aceito "tratar na rotação") | ❌ Não | Mesma classe de arquivo já vazou via EAS; sanitizar os 2 handoffs (`video-pipeline/HANDOFF.md`, `cloudflare-worker/handoff.md`) custa minutos e independe da rotação. |
| **CSP com `unsafe-inline`/`unsafe-eval`** (P1.15, débito documentado) | ✅ Sim | Sinks de HTML auditados neste review (escape correto em todos os 5); apertar com nonces segue como rodada futura. |
| **Deps preview pinadas NativeWind v5** (P1.8) | ✅ Sim | Pins exatos confirmados; lockfile + `.npmrc` seguram o build. |

---

## 4. Verificações ao vivo em produção (2026-08-06)

| Sonda | Resultado | Leitura |
|---|---|---|
| `GET /api/docs` (backend) | 404 | Swagger fechado em prod (P1.10 ✅ em runtime; também confirmado no código: `main.ts:87-101`) |
| `GET /api/v1/health` | 200 | Health vivo (P1.13 ✅; ver M3 sobre o path) |
| `GET /api/v1/auth/me` sem token | 401 | API viva e exigindo auth |
| Headers `www.projetocirurgiao.app` | CSP + HSTS + nosniff + XFO + Referrer-Policy + Permissions-Policy presentes | P1.15 ✅ em runtime (Vercel gru1) |
| DNS `app.projetocirurgiao.app` | **NXDOMAIN** (autoritativo Cloudflare) | Finding R3 |
| DNS apex `projetocirurgiao.app` | Sem registro A; não responde | Finding R3 |
| Cloud Run (env vs secret refs) | **Não verificado** — gcloud com auth expirada (`invalid_rapt`) | Condição A7 |

---

## 5. Smoke mobile em emulador Android (build debug local)

- **Build:** `npx expo run:android` — **BUILD SUCCESSFUL em 9m24s** (Gradle 8.14.3, JDK 17, SDK 54/RN 0.81.5). Prebuild regenerou `mobile-app/android/` (artefato local, gitignored — era esperado; a pasta tinha sido removida no estudo de 04/08).
- **Instalação:** primeira tentativa falhou com `INSTALL_FAILED_UPDATE_INCOMPATIBLE` (resto de build anterior com outra assinatura no emulador); resolvido com uninstall + install do APK debug. Instalação OK no `emulator-5554`.
- **Execução:** app abre, `MainActivity` resumed, **zero FATAL EXCEPTION** no logcat em toda a sessão.
- **Resultado do boot JS: ✅ PASSA.** Runtime JS sobe (`Running "main"`, Fabric/New Architecture), tela de login renderiza corretamente (marca, formulário, "Esqueceu a senha?", "Criar conta"), navegação login → registro funciona. Único warning JS: `setLayoutAnimationEnabledExperimental is a no-op` (inócuo, New Architecture).
- **Gotcha operacional descoberto (registrar para dev local):** nesta máquina o download do bundle via `10.0.2.2:8081` (rota NAT padrão do emulador) falha **deterministicamente** com `ProtocolException: Expected leading [0-9a-fA-F] character but was 0xd` (stream chunked corrompido — provável interferência de proxy/AV no host). Workaround validado: `adb reverse tcp:8081 tcp:8081` + gravar `debug_http_host=localhost:8081` nas shared prefs do app (via `run-as`). Sem isso, o app fica em tela preta com Metro saudável.
- **Achado do smoke (🟡, adicionado como M10):** a tela de login expõe "Criar conta" com formulário completo de **registro público** ("Registre-se para iniciar sua jornada!") — a política do cohort de teste é registro público OFF/convite-only. O formulário não foi submetido (criaria dados em prod), então não sei se o backend rejeita. Verificar se `POST /auth/register` (ou equivalente) está desabilitado/bloqueado em prod; se estiver, o fluxo mobile leva o aluno a um beco — esconder o link nesta fase. **Relevância dobrada pelo finding A1:** signup funcional + vínculo por e-mail = vetor de account takeover.
- **Limitação estrutural (precedente registrado):** login autenticado **não foi testado** — exige credencial do Firebase de produção e a política é não criar contas/dados em prod. Smoke autenticado segue exigindo o harness manual do Gustavo.

---

## 6. O que este review NÃO cobriu (não tratar silêncio como aprovação)

1. **Smoke em device físico Android** — só emulador (e apenas boot não-autenticado).
2. **Re-smoke iOS em device** — fora do escopo desta rodada.
3. **Vídeo-pipeline** (encode, Whisper, worker trCerto! Agora preciso de um relatório público que será apresentado ao professor, dono, proprietário, cliente da plataforma. Quero um overview do status do projeto que mostra ele em linguagem não técnica, ou seja, em linguagem natural. O status do projeto com uma linha do tempo simplificada que simboliza o inicio do projeto até o estado atual. É possível que você construa isso para mim, por favor? igger) — não revisado nesta rodada.
4. **Login autenticado mobile** — bloqueado por política (sem credencial de teste em prod).
5. **Estado real das env vars no Cloud Run** (A7) e **EAS env vars remotas** (A6) — bloqueados por auth expirada / login EAS.
6. **Console do Firebase** (signup aberto? proteção one-account-per-email?) — decide a severidade real de A1.
7. **Membros da organização Expo** (`expo.dev → Settings → Members`) — pendência da avaliação LGPD de 04/08.
8. **Varredura completa do histórico git** (gitleaks full) — o escopo foi `--since=2026-08-01` + padrões no working tree; R2 prova que há pelo menos um segredo no histórico. Recomendada antes de adicionar colaboradores.
9. **Runtime da web navegado** (dev server / fluxos de aluno) — review estático + headers ao vivo apenas.
10. **Restore de backup do Cloud SQL** — segue sem teste (borderline registrado no checklist de go-live).

---

## 7. Sequência sugerida (para decisão, não execução)

1. **Hoje, custo minutos:** decidir DNS (R3); mover/ignorar `docs/cademi-api/` (R1); apagar `.history/backend-api/` (A3); sanitizar os 2 handoffs (A2); deletar `app.json` da raiz (M9); checar console Firebase (A1) e `eas env:list` (A6).
2. **Janela de rotação (P0.2-B, agora condição de GO):** R2 keys + token Cademí + senha Postgres + WEBHOOK_SECRET + SA GCP — cada um após confirmar o mecanismo de carga do consumidor (A7 primeiro para o backend).
3. **Rodada de deps não-major** (A5): next, axios web+backend, form-data, websocket-driver → build + smoke.
4. **Pré-Android-lojas:** A4 + M6 + M7.
5. **Primeira semana:** M1–M9 e os itens de A1 (firebaseUid) conforme prioridade.
