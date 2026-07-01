# Projeto Cirurgião — Checklist Operacional P0/P1 de Go-Live

> **Origem:** checklist derivado da análise read-only feita em `/mnt/d/dashboard` com Claude Code em 2026-06-30.
>
> **Objetivo:** transformar os riscos P0/P1 em um plano executável para deixar o produto apto a release público controlado.
>
> **Escopo:** segurança, segredos, bugs críticos, CI/CD, observabilidade, mobile preview e publicação.
>
> **Fora de escopo:** P2 estrutural, novas features, refatorações grandes, pagamentos e consolidação definitiva de auth.

---

## 🔄 Revisão 2026-06-30 (2ª passada — validação contra o working tree)

O checklist original foi validado contra o código real. Convenções desta revisão:

- **IDs preservados** (P0.4, P0.7…) como âncoras estáveis. Quando o tier efetivo muda, marca-se `[TIER REVISADO: Px]` no título do item; a ordem real de trabalho está em **"Ordem revisada de execução"** (substituiu a original).
- **Já resolvidos no código (premissa do plano desatualizada):** **P0.5** (fechado — guard já existe) e **P0.4** (fail-fast já implementado, falta só commit+deploy).
- **Reclassificados:** P0.7 → P1 (só mobile defasado), P0.8 → P1 (hardening), P1.6 → P2 (só teste/demo).
- **Escopo corrigido:** P0.6 (inclui refresh token do SDK Firebase), P0.1 (não usar `*.sql` blanket), P0.2 (dividido em fase A segura / fase B rotação).
- **Novos itens (gaps encontrados):** **P0.9** (worker emissor do webhook) + bloco **"Gaps adicionados na revisão" (P1.9–P1.16)**.
- **Risco de ordem corrigido:** rotação de segredo (P0.2-B) sempre **depois** de trocar o mecanismo de carga (P0.3/P0.8), senão derruba prod.

---

## ✅ Status de execução (atualizado 2026-07-01)

Progresso real dos P0. Commits na `main` como `xoiurp`, **pushados** (`1c5521e..7103518`).

| Item | Status | Evidência |
|---|---|---|
| **P0.1** backups | ✅ **FEITO** | `.gitignore` cobre `db-backups/`+`*.sql.gz/.dump/.backup` (sem `*.sql` blanket). Commit `5086d43`. |
| **P0.2-A** scrub/inventário | ✅ **FEITO** | `.env.example`/`.env.proxy.example` só placeholders; nenhum segredo no histórico git; gcp-key/.history/firebase-SA ignorados. `dump_prod.ps1` fica em `D:\dashboard\` (fora do repo). |
| **P0.2-B** rotação | ⏳ **PENDENTE (Gustavo)** | Facilitado: `gcloud secrets versions add <NOME> --data-file=-` + redeploy. Prioridade: GCP key exposta + Firebase SA. JWT por último (invalida sessões). |
| **P0.3** Firebase fora do Docker | ✅ **DEPLOYADO+VALIDADO** | Commit `e5c7479`. Deploy rev `projeto-cirurgiao-api-00093-kzm`; logs: "initialized with inline service account" (Método 2 / Secret Manager) + "service account file not found" (fora da imagem). |
| **P0.4** WEBHOOK fail-fast | ✅ **FEITO** | Fail-fast já versionado (`server.py:38-42`); `WEBHOOK_SECRET` agora é secret gerenciado (ver P0.8). Falta só P0.9 (lado emissor). |
| **P0.5** double-tap quiz | ✅ **CÓDIGO OK** | Guard `isCheckingRef` já correto. Teste de integração pendente (opcional). |
| **P0.6** SecureStore | ✅ **CÓDIGO+TESTE** | Commit `4329d05`. Adapter chunking/encode; token + sessão SDK Firebase → SecureStore; teste 6/6. **Falta smoke em device real** (usuários logados deslogam 1x). |
| **P0.7** axios | ✅ **FEITO** | mobile 1.7.9→^1.18.1 (commit `b248c88`); web/backend já ^1.15.2. |
| **P0.8** Secret Manager | ✅ **DEPLOYADO** | 11 secrets no SM (project `projeto-cirurgiao-e8df7`), acesso mínimo à SA `81746498042-compute@`. Cutover backend (rev `00092-7zn`) + video-processor (rev `00016-dl6`), reusando secrets por igualdade de hash. Bug latente do script de deploy corrigido (commit `7103518`: migrator recebe `DATABASE_URL`). |
| **P0.9** worker emissor | ✅ **FEITO** | `video-processor-trigger` localizado em `video-pipeline/cloudflare-worker/` (gitignored) e versionado em `cloudflare-workers/video-processor-trigger/` (commit `2341fd1`), sem segredos. Par do `WEBHOOK_SECRET` confirmado (worker envia Bearer → `server.py` valida; mesmo valor nas 2 pontas). ⚠️ `handoff.md` local tem os valores em texto (risco aceito pelo Gustavo — tratar na rotação). |

**Rollbacks disponíveis:** backend `00092-7zn`; video-processor `00015-v8d`.

**Resumo:** todos os P0 de código/infra concluídos (P0.1–P0.9). Restam **P0.2-B** (rotação — Gustavo, inclui os 3 segredos expostos no `handoff.md` local: R2 access/secret + WEBHOOK), **P0.6-smoke** (device real) e **P0.5-teste** (opcional). Débito: a cópia do worker em `video-pipeline/cloudflare-worker/` (local de deploy atual) segue em disco; deploy futuro pode migrar para `cloudflare-workers/video-processor-trigger/`.

---

## Regras de execução

- [ ] Não expor valores de segredos em logs, commits, prints ou issues.
- [ ] Não rodar deploy em produção sem autorização explícita do Gustavo.
- [ ] Não rodar migrations/backfills destrutivos sem backup e aprovação.
- [ ] Antes de mexer em segredo real: registrar quais credenciais serão rotacionadas, mas não copiar valores para o plano.
- [ ] Depois de qualquer alteração em auth, vídeo, mobile storage ou infra: rodar smoke test manual.
- [ ] Commits pequenos, por item ou grupo coeso.
- [ ] Manter autoria conforme regra do projeto/Vercel, se aplicável: `xoiurp`.

---

## Critério de pronto geral

O projeto só sai do P0/P1 quando todos estes pontos estiverem verdadeiros:

- [x] Nenhum backup de banco ou credencial viva tem risco óbvio de `git add -A` acidental. *(P0.1)*
- [ ] Segredos críticos foram rotacionados ou há decisão explícita documentada de adiar com risco aceito. *(P0.2-B — pendente)*
- [x] Firebase service account não é copiada para imagem Docker. *(P0.3 — deployado+validado)*
- [x] Video processor falha no startup se `WEBHOOK_SECRET` estiver ausente. *(P0.4 — validado; video-processor bootou com fail-fast)*
- [x] Mobile não persiste token sensível em AsyncStorage (**inclui o refresh token do SDK Firebase**, não só o `firebaseToken`). *(P0.6 — código; falta smoke em device)*
- [x] Axios atualizado no **mobile** (web/backend já em ^1.15.2), com smoke test de login/API. *(P0.7 — código; smoke de API pendente)*
- [x] **Lado emissor e receptor do `WEBHOOK_SECRET`** compartilham o mesmo segredo (P0.4 + P0.9). *(worker versionado; par confirmado)*
- [ ] Existe error tracking mínimo ou, se adiado, está documentado como risco de lançamento.
- [ ] **CI mínimo de backend** existe (P1.3); para **web/mobile**, há item criado **ou** checklist reprodutível validado e explicitamente documentado (hoje não há item de CI web/mobile — decidir).
- [ ] Build mobile preview foi testado em device real.
- [ ] **Backend endurecido:** rate limiting em auth, Swagger fechado em prod, health check (P1.9/P1.10/P1.13) — ou risco aceito documentado.

---

# P0 — Bloqueadores antes de qualquer release público

## P0.1 — Blindar backups de banco contra commit acidental

**Objetivo:** impedir que dumps reais em `db-backups/` sejam commitados.

**Evidência da análise:** `db-backups/projeto_cirurgiao-20260603.sql.gz` existe e `db-backups/` não estava coberto pelo `.gitignore`.

**Arquivos:**
- Modificar: `.gitignore`
- Verificar: `db-backups/`

**Checklist:**

- [ ] Abrir `.gitignore` na raiz do repo canônico.
- [ ] Adicionar entrada explícita:

```gitignore
# Production/local database backups — never commit
db-backups/
*.sql.gz
*.dump
*.backup
```

> ⚠️ **Revisão:** NÃO adicionar `*.sql` em blanket. Há dezenas de `.sql` legitimamente rastreados (migrations Prisma, `scripts/init-db.sql`, `add-video-jobs.sql`). Um `*.sql` global esconderia migrations futuras do `git add` — repetindo o débito do `video-pipeline/` (que precisa de `git add -f`). `gcp-service-account-key/` já está ignorado.

- [ ] Verificar se não há backup já rastreado:

```bash
git ls-files | grep -E '(^|/)db-backups/|\.sql(\.gz)?$|\.dump$|\.backup$' || true
```

**Esperado:** nenhum arquivo sensível listado.

- [ ] Verificar status:

```bash
git status --short
```

**Esperado:** apenas `.gitignore` aparece como modificado, salvo se houver outras mudanças anteriores.

- [ ] Commit sugerido:

```bash
git add .gitignore
git commit -m "chore: ignore database backups"
```

**Aceite:** `db-backups/` e dumps SQL não aparecem mais como candidatos a commit.

---

## P0.2 — Inventariar e rotacionar segredos críticos em disco

**Objetivo:** remover dependência de credenciais vivas em arquivos locais e iniciar rotação segura.

**Evidência da análise:** credenciais reais ou históricas em:
- `/mnt/d/dashboard/dump_prod.ps1`
- `gcp-service-account-key/`
- `.env` / `backend-api/.env`
- `.env.example`
- `backend-api/.env.proxy.example`
- `.history/`

**Arquivos/pastas:**
- Revisar sem imprimir valores: `/mnt/d/dashboard/dump_prod.ps1`
- Revisar sem imprimir valores: `gcp-service-account-key/`
- Revisar sem imprimir valores: `.history/`
- Revisar exemplos: `.env.example`, `backend-api/.env.proxy.example`

> 🔄 **Revisão — item dividido em duas fases.** A ordem original (rotação monolítica **antes** de P0.3/P0.8) inverte a dependência e derruba prod. Fazer **fase A cedo** (segura, sem impacto em serviço) e **fase B tarde** (cada rotação **depois** de o seu consumidor migrar de mecanismo).

### Fase A — segura (cedo, sem tocar em serviço)

- [ ] Criar inventário local privado de nomes/tipos de segredo, sem valores.
- [ ] Confirmar quais credenciais ainda estão vivas:
  - [ ] Senha Postgres produção/app.
  - [ ] Token Cloudflare.
  - [ ] Firebase Admin service account.
  - [ ] GCP service account key.
  - [ ] Webhook secret do video processor (**os dois lados** — ver P0.9).
  - [ ] Secrets do worker `r2-browser` (ex.: `CDN_BASE_URL` e qualquer token admin).
- [ ] Apagar ou mover para cofre seguro os arquivos locais com segredo vivo (`dump_prod.ps1`, `gcp-service-account-key/`).
- [ ] Limpar `.history/` ou mover para fora do projeto.
- [ ] Garantir que `.history/`, `gcp-service-account-key/` e arquivos de dump estejam ignorados.
- [ ] Atualizar `.env.example` e `backend-api/.env.proxy.example` para conter apenas placeholders, nunca valores reais.
- [ ] **Histórico git:** se algum segredo já foi commitado no passado, planejar purga (`git filter-repo`/BFG) — `git ls-files`/`git log` só veem o estado atual. Definir critério de aceite que cubra blobs no histórico, não só arquivos no working tree.

### Fase B — rotações (tarde, cada uma colada ao deploy do seu consumidor)

> **Regra de ordem:** rotacionar **só depois** de o mecanismo de carga ter sido trocado, senão o serviço cai.

- [ ] Rotacionar **Firebase SA** — **somente após P0.3** (trocar carregamento antes de invalidar a chave baked na imagem).
- [ ] Rotacionar **WEBHOOK_SECRET / R2 / video** — **somente após P0.4 + P0.8 + P0.9** (migrar para secret refs nas duas pontas antes de girar o valor).
- [ ] Rotacionar **senha Postgres** — junto de update de env no Cloud Run + redeploy **atômico** (não há item de Secret Manager para Postgres; débito aceito no CLAUDE.md).
- [ ] Rotacionar **token Cloudflare** — mapear consumidores (wrangler/backend) e reduzir escopo ao mínimo; redeploy atômico.
- [ ] Rotacionar/revogar **GCP service account key** em `gcp-service-account-key/`.

**Comandos de verificação seguros:**

```bash
git status --short
```

```bash
git log --all -- .env .env.example backend-api/.env.proxy.example backend-api/firebase-service-account.json firebase-service-account.json
```

**Não fazer:** colar valores de segredos no terminal, issues, docs ou commits.

**Aceite:** segredos críticos rotacionados ou formalmente marcados como risco aceito; arquivos locais perigosos removidos/movidos; exemplos só com placeholders.

---

## P0.3 — Remover Firebase service account da imagem Docker do backend

**Objetivo:** impedir que chave privada fique embutida em layer Docker/registry.

**Evidência da análise:** `backend-api/Dockerfile` faz `COPY firebase-service-account.json`.

**Arquivos:**
- Modificar: `backend-api/Dockerfile`
- Revisar: `backend-api/src/config/secrets/secrets-loader.ts`
- Revisar: bootstrap/config do Firebase Admin no backend

**Checklist:**

- [ ] Localizar `COPY firebase-service-account.json` no Dockerfile.
- [ ] Remover o `COPY` da imagem.
- [ ] Confirmar como Firebase Admin carrega credenciais hoje.
- [ ] Definir alternativa:
  - [ ] Preferencial: Workload Identity / Application Default Credentials no Cloud Run.
  - [ ] Alternativa: Secret Manager montado/injetado com mínimo escopo.
- [ ] Atualizar código/config para não exigir arquivo local dentro da imagem.
- [ ] Buildar imagem localmente sem segredo:

```bash
cd backend-api
npm run build
```

- [ ] Se houver Docker disponível:

```bash
docker build -t projeto-cirurgiao-backend:test .
```

- [ ] Verificar que `firebase-service-account.json` não entra no contexto/imagem.
- [ ] Commit sugerido:

```bash
git add backend-api/Dockerfile backend-api/src/config/secrets/secrets-loader.ts
 git commit -m "fix: load firebase credentials outside docker image"
```

**Aceite:** backend builda sem copiar service account para imagem; Cloud Run tem estratégia segura de credencial.

---

## P0.4 — Validar `WEBHOOK_SECRET` obrigatório no video processor

**Objetivo:** garantir que o video processor não aceite webhook sem segredo configurado.

**Evidência da análise:** risco histórico de bypass se `WEBHOOK_SECRET` vazio; `server.py` parecia corrigido localmente, mas modificado/não commitado.

> ✅ **Revisão — fail-fast JÁ IMPLEMENTADO** no working tree (não commitado). `video-pipeline/cloud-run/server.py:34-42` faz `raise RuntimeError` quando vazio; `/process` exige `Bearer`. Item deixa de ser implementação e vira **operacional**: commitar o arquivo + confirmar a var em prod + deploy autorizado. **Não fecha sozinho — ver P0.9 (lado emissor).**

**Arquivos:**
- Revisar/modificar: `video-pipeline/cloud-run/server.py`
- Revisar config Cloud Run do video processor

**Checklist:**

- [ ] Verificar status do arquivo:

```bash
git status --short -- video-pipeline/cloud-run/server.py
```

- [ ] Confirmar se o código faz fail-fast quando `WEBHOOK_SECRET` está ausente/vazio.
- [ ] Se não fizer, implementar validação no startup.
- [ ] Adicionar teste simples ou script de verificação se houver estrutura de testes no pipeline.
- [ ] Confirmar que a variável está setada no Cloud Run de produção, sem exibir o valor:

```bash
gcloud run services describe <VIDEO_PROCESSOR_SERVICE> --region <REGION> --format='value(spec.template.spec.containers[0].env[].name)' | grep WEBHOOK_SECRET
```

- [ ] Confirmar que o fix foi commitado.
- [ ] Confirmar que o fix foi deployado somente com autorização explícita.

**Aceite:** sem `WEBHOOK_SECRET`, o serviço falha ao iniciar; em produção, a var existe; fix está versionado e deployado quando autorizado.

---

## P0.5 — Corrigir race condition de double-tap no quiz mobile  ✅ [RESOLVIDO — só falta teste]

**Objetivo:** impedir múltipla submissão de resposta e duplicação de XP/haptic.

**Evidência da análise:** `QuizPlayer.tsx` tem guard `isChecking` incompleto/inexistente no fluxo crítico.

> ✅ **Revisão — premissa desatualizada, código JÁ CORRETO.** `mobile-app/src/components/quiz/QuizPlayer.tsx:132` define `isCheckingRef = useRef(false)`; `:254` faz early-return se já travado; `:255` ativa a trava **antes** de qualquer await; liberada em `:284`. O guard síncrono que o checklist pede já existe. **Única ação restante:** adicionar teste de regressão de duplo-tap. Não é bloqueador.

**Arquivos:**
- Modificar: `mobile-app/src/components/quiz/QuizPlayer.tsx`
- Testar/adicionar teste: localizar testes de quiz em `mobile-app/`

**Checklist:**

- [ ] Ler `QuizPlayer.tsx` e localizar handler de resposta.
- [ ] Implementar trava síncrona com `useRef`, por exemplo `isSubmittingRef`.
- [ ] Garantir que a trava é ativada antes de qualquer await/setState assíncrono.
- [ ] Garantir liberação da trava em erro/cleanup quando apropriado.
- [ ] Desabilitar UI enquanto resposta está sendo processada.
- [ ] Adicionar teste para duplo clique/tap chamando handler duas vezes rapidamente.
- [ ] Rodar testes mobile relevantes:

```bash
cd mobile-app
npm test -- QuizPlayer
```

ou, se não houver filtro compatível:

```bash
cd mobile-app
npm test
```

**Aceite:** dois taps rápidos resultam em uma única submissão/XP/haptic.

---

## P0.6 — Migrar token sensível do mobile para SecureStore

**Objetivo:** parar de persistir token de auth em AsyncStorage sem criptografia.

**Evidência da análise:** `expo-secure-store` está instalado, mas token ainda usa AsyncStorage.

> ⚠️ **Revisão — escopo subestimado.** Migrar só o `firebaseToken` (ID token, 1h) de `auth-store.ts`/`client.ts` é **incompleto**: `mobile-app/src/services/firebase.ts:22-24` configura `getReactNativePersistence(AsyncStorage)`, então o **refresh token de longa duração do próprio SDK Firebase** continua em AsyncStorage não-criptografado mesmo após a migração descrita. O fix **precisa** incluir um storage adapter criptografado (SecureStore) para a persistência do Firebase Auth — senão o item dá falsa sensação de resolvido. Adicionar ao checklist abaixo um passo cobrindo `firebase.ts`.

**Arquivos:**
- Modificar: `mobile-app/src/services/api/client.ts`
- Modificar: `mobile-app/src/stores/auth-store.ts` ou arquivo equivalente
- Verificar: persistência Zustand/Auth

**Checklist:**

- [ ] Identificar onde access token e refresh token são persistidos.
- [ ] Separar estado não sensível, que pode continuar em Zustand/AsyncStorage, de tokens sensíveis.
- [ ] Criar wrapper de storage para tokens usando `expo-secure-store`.
- [ ] Migrar login para salvar tokens no SecureStore.
- [ ] Migrar logout para apagar tokens do SecureStore.
- [ ] Migrar boot/hydration para ler tokens do SecureStore.
- [ ] Garantir que interceptors Axios continuam funcionando.
- [ ] Testar cenários:
  - [ ] Login novo.
  - [ ] Fechar e reabrir app.
  - [ ] Refresh token expirado.
  - [ ] Logout.

**Comandos:**

```bash
cd mobile-app
npm test
```

**Aceite:** tokens sensíveis não aparecem no AsyncStorage; login/refresh/logout seguem funcionando.

---

## P0.7 — Atualizar Axios em web e mobile  ⬇️ [TIER REVISADO: P1 — só mobile]

**Objetivo:** corrigir CVEs reportadas em Axios.

**Evidência da análise:** web e mobile usam Axios com CVE-2025-62718/GHSA HIGH.

> ⬇️ **Revisão — web/backend já atualizados.** `frontend-web` e `backend-api` já estão em `axios@^1.15.2` (praticamente latest); **só `mobile-app` está defasado** (`1.7.9`). As CVEs de axios são predominantemente server-side (SSRF/redirect/DoS) com baixa exploitabilidade num app mobile que fala só com o próprio backend → **P1, não bloqueador**. Continua um `npm install` trivial; o passo restante é o do mobile. (O passo "web" abaixo pode ser marcado feito após confirmar a versão.)

**Arquivos:**
- Modificar: `frontend-web/package.json`
- Modificar: `frontend-web/package-lock.json` ou lockfile equivalente
- Modificar: `mobile-app/package.json`
- Modificar: `mobile-app/package-lock.json` ou lockfile equivalente

**Checklist:**

- [ ] Verificar versão atual:

```bash
cd frontend-web && npm ls axios
cd ../mobile-app && npm ls axios
```

- [ ] Atualizar Axios no web:

```bash
cd frontend-web
npm install axios@latest
npm audit --omit=dev
```

- [ ] Atualizar Axios no mobile:

```bash
cd ../mobile-app
npm install axios@latest
npm audit --omit=dev
```

- [ ] Rodar testes/builds relevantes:

```bash
cd ../frontend-web
npm run lint
npm run build
```

```bash
cd ../mobile-app
npm test
```

- [ ] Smoke test manual:
  - [ ] Login web.
  - [ ] Login mobile.
  - [ ] Requisição autenticada com refresh/interceptor.
  - [ ] Tratamento de erro 401.

**Aceite:** Axios atualizado, audit sem CVE crítica/alta de Axios, fluxos de API continuam funcionando.

---

## P0.8 — Migrar segredos do video processor para Secret Manager  ⬇️ [TIER REVISADO: P1]

**Objetivo:** reduzir plaintext env vars no Cloud Run GPU/video processor.

**Evidência da análise:** `video-pipeline/cloud-run/server.py` lê segredos de `os.environ`.

> ⬇️ **Revisão — hardening, não bloqueador.** Com a rotação de segredos (P0.2-B) e o fail-fast (P0.4) garantidos, mover env vars plaintext para Secret Manager é defense-in-depth → **P1**. Mesmo arquivo e mesmo deploy que P0.4 (batch no deploy do video-processor). Depende de P0.4.

**Arquivos:**
- Modificar: `video-pipeline/cloud-run/server.py`
- Modificar: deploy/config do Cloud Run video processor
- Documentar: docs de deploy/runbook

**Checklist:**

- [ ] Listar nomes de env vars sensíveis usadas pelo video processor, sem valores.
- [ ] Criar/confirmar secrets no Secret Manager.
- [ ] Dar acesso mínimo à service account do Cloud Run.
- [ ] Atualizar deploy para injetar secrets como secret refs.
- [ ] Manter fail-fast para secrets obrigatórios ausentes.
- [ ] Validar startup em ambiente controlado.
- [ ] Só deployar produção com autorização explícita.

**Aceite:** video processor não depende de valores plaintext configurados manualmente; secrets vêm do Secret Manager/secret refs; serviço falha se obrigatório ausente.

---

## P0.9 — Garantir o lado EMISSOR do `WEBHOOK_SECRET` (worker `video-processor-trigger`)  🆕 [NOVO — gap da revisão]

**Objetivo:** fechar o par emissor/receptor do webhook. P0.4 só garante que o **receptor** (`server.py`) recusa requisição sem segredo; o **emissor** que assina/envia o webhook precisa do mesmo segredo configurado — e está fora do controle de versão.

**Evidência da revisão:** `cloudflare-workers/` contém **apenas `r2-browser`**. O worker `video-processor-trigger` (citado no CLAUDE.md e em ~6 docs) **não está versionado no repo** — mesmo risco de processo do `video-pipeline/` no `.gitignore`. Sem os dois lados com o mesmo segredo rotacionado, P0.4 fica meio-feito.

**Arquivos/alvos:**
- Localizar o código real do `video-processor-trigger` (worker Cloudflare).
- Decidir: versionar no repo (recomendado) ou documentar onde vive + como faz deploy.
- Config do segredo via `wrangler secret put` (não em `wrangler.toml` em texto).

**Checklist:**

- [ ] Localizar o worker emissor e confirmar onde o `WEBHOOK_SECRET` é configurado hoje.
- [ ] Trazer o worker para controle de versão **ou** registrar no runbook localização + processo de deploy.
- [ ] Garantir que o segredo do emissor == segredo do receptor (P0.4), nas duas pontas.
- [ ] Incluir o segredo do emissor na rotação de P0.2-B (girar as duas pontas na mesma janela).
- [ ] Smoke test: evento R2 → worker dispara → `server.py` aceita (com segredo) e recusa (sem/errado).

**Aceite:** emissor e receptor compartilham o mesmo `WEBHOOK_SECRET`; rotação cobre as duas pontas; o worker está versionado ou documentado de forma reproduzível.

---

# P1 — Qualidade pré-lançamento e publicação

## P1.1 — Resolver contas e credenciais Apple/Google Play

**Objetivo:** destravar publicação mobile.

**Arquivos:**
- Revisar: `mobile-app/eas.json`
- Revisar: configs EAS/Expo

**Checklist:**

- [ ] Confirmar acesso Apple Developer.
- [ ] Confirmar acesso Google Play Console.
- [ ] Confirmar bundle identifiers/package names.
- [ ] Configurar credenciais EAS para iOS.
- [ ] Configurar credenciais EAS para Android.
- [ ] Validar `eas.json` para perfis preview/production.
- [ ] Documentar no runbook sem segredos.

**Aceite:** `eas credentials` não bloqueia build/submit por falta de conta/credencial.

---

## P1.2 — Adicionar error tracking e crash reporting

**Objetivo:** tornar falhas de produção visíveis.

**Componentes:**
- Backend: Sentry ou equivalente.
- Web: Sentry ou equivalente.
- Mobile: Sentry ou Crashlytics.

**Arquivos prováveis:**
- `backend-api/src/main.ts`
- `frontend-web/next.config.*`
- `frontend-web/src/app/*`
- `mobile-app/app/_layout.*`
- `mobile-app/app.json` ou `app.config.*`

**Checklist:**

- [ ] Escolher ferramenta padrão: Sentry para backend/web/mobile ou Crashlytics para mobile.
- [ ] Criar projetos DSN separados por ambiente.
- [ ] Configurar DSNs por Secret Manager/env, sem commitar valores.
- [ ] Backend: capturar exceções globais e contexto mínimo.
- [ ] Web: capturar erros client/server e source maps se aplicável.
- [ ] Mobile: adicionar ErrorBoundary global e captura de crash.
- [ ] Criar evento de teste em cada componente.
- [ ] Documentar como consultar alertas.

**Aceite:** erro de teste aparece no painel de observabilidade para backend, web e mobile.

---

## P1.3 — Criar CI/CD mínimo para backend

**Objetivo:** reduzir deploy manual e erro humano.

**Arquivos:**
- Criar/modificar: `.github/workflows/backend-ci.yml`
- Revisar: `backend-api/package.json`
- Revisar: docs de deploy backend

**Checklist:**

- [ ] Criar workflow de CI em PR/push.
- [ ] Rodar install determinístico.
- [ ] Rodar lint/typecheck, se existirem.
- [ ] Rodar testes.
- [ ] Rodar build.
- [ ] Opcional: gerar Prisma client.
- [ ] Separar deploy de produção atrás de aprovação/manual dispatch.
- [ ] Não colocar segredos no YAML.

**Comandos base esperados:**

```bash
cd backend-api
npm ci
npx prisma generate
npm run build
npm test
```

**Aceite:** PR quebra se backend não builda/testa; deploy não depende apenas de PowerShell local.

---

## P1.4 — Corrigir ou remover workflow iOS quebrado

**Objetivo:** remover falsa sensação de CI mobile.

**Evidência da análise:** workflow aponta para `ios-app/`, mas pasta real parece ser `iOS/`; há `|| true` mascarando falhas.

**Arquivos:**
- Revisar/modificar: `.github/workflows/ios-tests.yml`
- Revisar: `mobile-app/`

**Checklist:**

- [ ] Abrir workflow atual.
- [ ] Confirmar caminhos reais.
- [ ] Remover `|| true` de etapas que deveriam falhar.
- [ ] Corrigir para `mobile-app/` se o app canônico é Expo.
- [ ] Se não houver valor imediato, remover/desabilitar workflow órfão e criar issue/plano.
- [ ] Rodar validação local dos comandos configurados.

**Aceite:** workflow ou passa validando algo real, ou é removido para não mascarar risco.

---

## P1.5 — Build preview e smoke test em device real

> 📋 **Checklist operacional pronto para execução manual:** `docs/mobile-preview-smoke-checklist.md` (pré-requisitos, comandos EAS, gotcha do monorepo, matriz de smoke iOS/Android, critérios de aceite). **P1.5 permanece ABERTO** — gate manual do Gustavo (device real). Marcar aqui com o resultado ao concluir.

**Objetivo:** validar que o app mobile funciona fora do ambiente dev.

**Arquivos:**
- `mobile-app/eas.json`
- `mobile-app/app.json` ou `app.config.*`
- checklist do onboarding/runbook

**Checklist:**

- [ ] Confirmar envs de preview.
- [ ] Se monorepo quebrar EAS, copiar `mobile-app/` para pasta temp isolada conforme gotcha documentado.
- [ ] Rodar build preview iOS.
- [ ] Rodar build preview Android.
- [ ] Instalar em device real.
- [ ] Testar:
  - [ ] Login.
  - [ ] Persistência/reabertura de sessão.
  - [ ] Player HLS.
  - [ ] Legenda pt-BR.
  - [ ] Quiz.
  - [ ] Proteção double-tap.
  - [ ] Gamificação/XP.
  - [ ] Fórum.
  - [ ] Chat/RAG.
  - [ ] Logout.
- [ ] Registrar bugs encontrados.

**Comandos:**

```bash
cd mobile-app
eas build --profile preview --platform ios
```

```bash
cd mobile-app
eas build --profile preview --platform android
```

**Aceite:** app preview roda em device real com fluxo principal validado.

---

## P1.6 — Trocar placeholder HLS por playlist R2 real nos seeds/E2E  ⬇️ [TIER REVISADO: P2]

**Objetivo:** evitar falso positivo em testes/demos de vídeo.

> ⬇️ **Revisão — P2.** Placeholder HLS em seed/E2E só causa falso positivo em teste/demo; **zero impacto em produção**. Não precisa entrar no go-live controlado. Item vago: o `grep` proposto é amplo e não aponta o seed/asset canônico — definir o arquivo e o asset R2 estável antes de executar.

**Arquivos:**
- Localizar seeds/scripts E2E que referenciam HLS placeholder.
- Possíveis áreas: `backend-api/prisma/`, `backend-api/scripts/`, testes E2E, docs.

**Checklist:**

- [ ] Localizar placeholder HLS:

```bash
grep -R "placeholder\|m3u8\|HLS" -n backend-api frontend-web mobile-app docs | head -100
```

- [ ] Escolher playlist R2 real de teste, não sensível.
- [ ] Atualizar seed/E2E para usar asset estável.
- [ ] Rodar seed/teste em ambiente controlado.
- [ ] Confirmar player web/mobile com o mesmo asset.

**Aceite:** teste/demo de vídeo usa playlist R2 real e estável.

---

## P1.7 — Endurecer middleware de rota da web

**Objetivo:** evitar autorização baseada em cookie de role forjável.

**Evidência da análise:** `middleware.ts` usa cookie de role não-assinado/frágil.

> 🔄 **Revisão — path correto e severidade confirmada.** O arquivo real é `frontend-web/src/middleware.ts` (`:47-52` faz `JSON.parse(cookie).role` sem assinatura). Severidade **P1 confirmada (não promover a P0)**: o cookie é forjável, mas o backend valida o token Firebase em toda request → role forjada só renderiza o *chrome* da UI admin (páginas admin são client-rendered via Zustand/localStorage, sem SSR confiando no cookie). Dados continuam protegidos no servidor. ⚠️ Mover enforcement para o backend pode alterar contrato de API (`/me`/session) → avisar o time antes (regra do projeto).

**Arquivos:**
- Modificar: `frontend-web/src/middleware.ts`
- Revisar: auth client/server da web
- Revisar: backend endpoint de sessão/me, se existir

**Checklist:**

- [ ] Ler `frontend-web/middleware.ts`.
- [ ] Identificar fonte atual de role.
- [ ] Remover confiança em cookie de role não-assinado.
- [ ] Usar token/session validável ou mover enforcement real para backend/API.
- [ ] Middleware pode continuar fazendo UX redirect, mas não deve ser fronteira de segurança.
- [ ] Adicionar teste/manual check:
  - [ ] usuário student não acessa admin.
  - [ ] cookie alterado manualmente não concede admin.

**Aceite:** acesso admin depende de autorização validada, não de role manipulável no client.

---

## P1.8 — Pinar dependências preview/nightly do mobile  ✅ FEITO

**Objetivo:** reduzir risco de build quebrar perto da publicação.

**Evidência da análise:** mobile usa deps preview/nightly, incluindo NativeWind/react-native-css.

> ✅ **Decisão (feito):** as 2 deps instáveis — `nativewind@5.0.0-preview.2` e `react-native-css@0.0.0-nightly.5ce6396` — **já estavam com pin exato** (sem `^`/`~`), então não há range flutuante a corrigir. **Mantidas pinadas por compatibilidade** (NativeWind v5 é preview em toda a linha; estável só na v4 = migração ampla de styling, fora de escopo agora). **Não serão alteradas antes do preview (P1.5).** Reavaliação → P2/pós-go-live. Verificado: `npm test` verde (16 suites/56), `npm ci` não altera lockfile, `npm test` verde pós-install. Doc em `mobile-app/docs/DEPLOY.md §1.1`. Sem mudança de package (docs-only).

**Arquivos:**
- `mobile-app/package.json`
- lockfile do mobile

**Checklist:**

- [ ] Listar dependências com tags preview/nightly/canary/beta.
- [ ] Para cada uma, decidir:
  - [ ] substituir por versão estável;
  - [ ] manter com justificativa documentada;
  - [ ] abrir tarefa P2 de migração.
- [ ] Atualizar package.json/lockfile.
- [ ] Rodar testes.
- [ ] Rodar build preview se a mudança afetar runtime/styling.

**Comandos:**

```bash
cd mobile-app
npm install
npm test
```

**Aceite:** dependências instáveis foram removidas ou explicitamente justificadas; app ainda builda/testa.

---

# 🆕 Gaps adicionados na revisão (P1.9–P1.16)

Riscos de go-live dentro do escopo declarado que o checklist original não cobria. Spot-checks: `backend-api/src/main.ts` tem CORS explícito e `ValidationPipe`, mas **sem** helmet, **sem** rate limiting e Swagger montado incondicionalmente; `.github/workflows/` só tem `ios-tests.yml`; existem `firebase.json`/`.firebaserc` (web sai em Vercel **e** Firebase Hosting).

## P1.9 — Rate limiting / throttling no backend  🆕

**Evidência:** `main.ts` não usa `@nestjs/throttler` nem equivalente. Login/refresh expostos a brute-force/credential-stuffing num release público.

- [ ] Adicionar `@nestjs/throttler` (global + limite mais estrito em login/refresh).
- [ ] Validar que requests legítimos não são bloqueados.

**Aceite:** endpoints de auth têm limite de taxa; abuso é barrado.

## P1.10 — Não expor Swagger em produção  🆕

**Evidência:** `/api/docs` é montado incondicionalmente, sem guard por `NODE_ENV` → information disclosure (todos os endpoints/DTOs).

- [ ] Condicionar o setup do Swagger a `NODE_ENV !== 'production'` (ou guard por auth).

**Aceite:** `/api/docs` não responde anônimo em produção.

## P1.11 — Secret scanning no CI  🆕

**Evidência:** P0.2 limpa segredos vazados, mas nada impede recommit.

- [ ] Adicionar job de gitleaks/trufflehog ao CI (P1.3), bloqueante em PR.

**Aceite:** PR com segredo é barrado automaticamente.

## P1.12 — Rollback de deploy documentado  🆕 ✅ FEITO (doc)

**Evidência:** nenhum item cobre reversão para "release controlado".

- [x] Documentar rollback: Cloud Run (revisions) + Vercel (instant rollback) + EAS. **`docs/RUNBOOK-ROLLBACK.md`** — cobre backend Cloud Run, video-processor Cloud Run (`europe-west1`), Vercel canônica (Firebase = legado, não é rollback), EAS (OTA vs binário), Cloudflare Workers (`r2-browser`/`video-processor-trigger`) e seção explícita Prisma/banco (forward-only; app rollback ≠ DB rollback).
- [ ] Validar uma reversão em ambiente controlado. **PENDENTE — exige deploy/rollback real (Gustavo); fora do escopo desta rodada docs-only.**

**Aceite:** procedimento de rollback testado e no runbook. ✅ Runbook pronto; teste de reversão real fica como gate manual do Gustavo (como P1.5).

## P1.13 — Health check / uptime monitoring  🆕

**Evidência:** P1.2 cobre só error/crash tracking, não disponibilidade.

- [ ] Endpoint `/health` (readiness) no backend.
- [ ] Monitor de uptime + alerta de serviço fora do ar.

**Aceite:** queda do backend dispara alerta.

## P1.14 — Consistência do deploy web Firebase Hosting × Vercel  🆕 ✅ FEITO

**Evidência:** `firebase.json`/`.firebaserc` na raiz; web sai em duas plataformas.

- [x] Definir qual é canônica; alinhar headers/redirects/SPA fallback. **Canônica = Vercel.**
- [x] Garantir que não há divergência de versão servida entre as duas. **Firebase Hosting era config morta (`frontend-web/out` nunca gerado — app não é `output: 'export'` e tem middleware edge); trocado por redirect 301 → `https://app.projetocirurgiao.app`.**

**Aceite:** deploy web consistente; canônica documentada. ✅ Doc em `frontend-web/docs/DEPLOY.md §0` + `CLAUDE.md`; `firebase.json` redireciona (não serve app). Deploy do Firebase não executado (fora de escopo) — redirect passa a valer no próximo `firebase deploy --only hosting`, se houver.

## P1.15 — Security headers (helmet na API + CSP na web)  🆕 [borderline] ✅ FEITO

- [x] `helmet()` no backend (HSTS, X-Content-Type-Options, etc.). **Feito no P1.9-bloco (commit `752c9a1`), `main.ts`.**
- [x] Headers/CSP na web (`next.config`). **`frontend-web/next.config.ts` `async headers()`: CSP enforced + nosniff/Referrer-Policy/X-Frame-Options/Permissions-Policy em `/:path*`. Emitido pela Vercel canônica (não Firebase). Verificado via `next start`+`curl`.**

**Aceite:** respostas trazem headers de segurança básicos. ✅ Doc em `frontend-web/docs/DEPLOY.md §2.1`. Débito: CSP ainda com `'unsafe-inline'`/`'unsafe-eval'` — apertar com nonces em rodada futura.

## P1.16 — Scrubbing de PII/segredos no error tracking  🆕 [borderline]

**Evidência:** ao adicionar Sentry (P1.2), capturar request bodies/headers pode vazar tokens.

- [ ] Configurar `beforeSend`/scrubbing para não enviar tokens/PII.

**Aceite:** evento de teste não contém segredo/PII.

> **Borderline fora do escopo estrito (registrar, decidir caso a caso):** teste de **restore** + agendamento verificado do backup Cloud SQL (P0.1 só impede *commitar* backup, não garante backup automático nem restore testado).

---

# Ordem revisada de execução

> Substitui a ordem original (que tinha 2 bugs de sequência). Principais correções: **P1.1 sobe para o dia 0** (lead time externo trava P1.5); **P0.2 dividida** em A (cedo) e B (rotação, tarde); **rotação sempre depois** da troca de mecanismo (P0.3/P0.8/P0.9), senão derruba prod; **P1.8 antes de P1.5** (pinar deps depois invalida o smoke test).

## Dia 0 — disparar já (lead time / sem dependência)

1. [ ] **P1.1** — contas Apple/Google Play (externo, dias–semanas; trava P1.5 e o Done criteria). Roda em background o tempo todo.
2. [x] **P0.1** — blindar `db-backups/` (sem `*.sql` blanket). ✅
3. [x] **P0.2 fase A** — inventário, scrub de arquivos locais, `.env.example` com placeholders, histórico git verificado (nada commitado). ✅

## Trilhas paralelas (após o dia 0)

**Trilha mobile-código** (independentes entre si → convergem em P1.5):
- [~] P0.5 — código já correto; teste de regressão pendente (opcional).
- [x] P0.6 — token + persistência do SDK Firebase para SecureStore. ✅ *(falta smoke em device)*
- [x] P0.7 (mobile) — axios → ^1.18.1. ✅
- [ ] P1.8 — pinar deps nightly do mobile. **(antes de P1.5)**

**Trilha web** (independente):
- [x] P0.7 (web) — confirmado ^1.15.2 (já atualizado). ✅
- [ ] P1.7 — endurecer middleware (`src/middleware.ts`); avisar time se mudar contrato.

**Trilha backend/infra** (sequencial nos deploys — batch para reduzir janelas de autorização):
- [x] P0.3 — Firebase SA fora da imagem Docker. ✅ deployado+validado (rev `00093-kzm`)
- [x] P0.4 — fail-fast já versionado; `WEBHOOK_SECRET` migrado p/ Secret Manager. ✅
- [x] P0.9 — worker emissor versionado em `cloudflare-workers/video-processor-trigger/`; par do segredo confirmado. ✅
- [x] P0.8 — secrets → Secret Manager (backend rev `00092` + video-processor rev `00016`). ✅
- [ ] P1.3 — CI backend (cedo, valida build antes dos deploys). + P1.11 secret scanning.
- [ ] P1.2 — error tracking (backend-Sentry no deploy do P0.3; mobile-Sentry antes de P1.5) + P1.16 scrubbing.
- [ ] P1.9 / P1.10 / P1.13 / P1.15 — rate limit, Swagger off em prod, health check, security headers (encaixar nos deploys de backend).

## Tarde — rotações e gates finais

- [ ] **P0.2 fase B** — rotações, **cada uma depois** do seu consumidor migrado: Firebase SA (após P0.3); WEBHOOK/R2/video (após P0.4+P0.8+P0.9); Postgres/Cloudflare token (update de env + redeploy atômico).
- [ ] **P1.5** — build preview + smoke test em device real (**gate final**: depende de P0.5/P0.6/P0.7-mobile/P1.8/P1.1/P1.2-mobile).
- [ ] P1.4 — corrigir/remover workflow iOS (a qualquer momento).
- [ ] P1.12 / P1.14 — rollback documentado, consistência Firebase Hosting × Vercel.

## Batches de deploy (cada deploy de prod = 1 autorização do Gustavo)

- **Deploy backend:** P0.3 + P1.2-backend + P1.9/P1.10/P1.13/P1.15 + secret refs (Firebase/Postgres).
- **Deploy video-processor:** P0.4 + P0.8 + P0.9 + rotação WEBHOOK.

---

# Registro de decisões pendentes

Preencher conforme o trabalho avançar.

| Data | Decisão | Responsável | Observações |
|---|---|---|---|
| 2026-06-30 | Checklist criado a partir da análise read-only | Hermes/Claude Code | Aguardando execução |
| 2026-06-30 | 2ª passada: validação contra código (3 subagentes paralelos) | Claude Code | P0.5 fechado; P0.4 só commit; P0.7/P0.8→P1; P1.6→P2; +P0.9 e P1.9–P1.16; ordem corrigida (rotação depois da migração) |
| 2026-07-01 | Execução P0.1/2-A/3/4/5/6/7/8 + Secret Manager completo | Claude Code (aut. Gustavo p/ deploys) | Commits `5086d43..7103518` (push). Deploys: backend rev `00093-kzm` (P0.3+cutover), video-processor rev `00016-dl6`. 11 secrets no SM. Restam P0.2-B, P0.9, P0.6-smoke, P0.5-teste |
| 2026-07-01 | Migração p/ Secret Manager além do escopo P0.8 original | Claude Code | P0.8 previa só video-processor; estendido ao backend (9 secrets) pois estavam todos plaintext. Cutover atômico `--remove-env-vars`+`--update-secrets`. Rotação (P0.2-B) adiada pelo Gustavo |

---

# Notas de risco aceito

Use esta seção se algum P0/P1 for conscientemente adiado.

| Item | Risco | Por que foi aceito | Data limite para resolver | Aprovador |
|---|---|---|---|---|
| | | | | |

---

# Comandos úteis de triagem

```bash
# status geral
git status --short

# arquivos sensíveis rastreados por engano
git ls-files | grep -Ei '(^|/)(\.env|db-backups|gcp-service-account-key)|\.(sql|sql.gz|dump|backup)$' || true

# histórico de arquivos de segredo conhecidos
git log --all -- .env .env.example backend-api/.env.proxy.example backend-api/firebase-service-account.json firebase-service-account.json

# backend
cd backend-api
npm ci
npx prisma generate
npm run build
npm test

# web
cd frontend-web
npm ci
npm run lint
npm run build

# mobile
cd mobile-app
npm ci
npm test
```

---

# Done criteria final para go-live controlado

- [ ] Todos os P0 concluídos (P0.1, P0.2, P0.3, P0.4, P0.6, P0.9). *P0.5 já resolvido (só teste); P0.7/P0.8 rebaixados a P1.*
- [ ] P1.1 concluído ou contas externas com prazo formal.
- [ ] P1.2 concluído para backend + mobile (**web: decidir explicitamente** se entra agora ou vira risco aceito — aceite do P1.2 pede os três).
- [ ] P1.3 concluído ou deploy manual validado com checklist assinado.
- [ ] P1.5 concluído com device real.
- [ ] P1.9/P1.10/P1.13 (rate limit, Swagger off, health check) concluídos ou risco aceito documentado.
- [ ] Lado emissor do webhook (P0.9) coberto.
- [ ] Rollback de deploy documentado e testado (P1.12).
- [ ] Smoke test web/mobile/backend documentado.
- [ ] Gustavo aprova explicitamente qualquer deploy/submit de produção.
