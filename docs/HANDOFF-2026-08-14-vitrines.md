# HANDOFF — 2026-08-13/14 · Vitrines com controle de acesso por compra

> **Este é o documento de entrada do projeto.** Descreve o estado **verificado**
> em produção, o que mudou **dentro** do repo, o que mudou **fora** dele
> (consoles e **dados de produção** — nada disso aparece no `git log`), e o que
> ficou aberto.
>
> Leitura complementar, nesta ordem:
> 1. `docs/plans/2026-08-12-vitrines-controle-acesso-design.md` — o design aprovado
> 2. `CLAUDE.md` — arquitetura e gotchas permanentes
> 3. `docs/HANDOFF-2026-08-11-pre-live-execucao.md` — a rodada anterior (review
>    pré-live). Continua válido para tudo que não foi alterado aqui.

---

## 1. O que foi construído

Segmentação do catálogo em **vitrines**: recortes temáticos vendidos
separadamente (o professor vende "Castração Descomplicada" no TheMembers).
Quem compra vê o conteúdo daquela vitrine; o resto do catálogo aparece com
**preview de 2 minutos** como provocação de compra. Escala até a
pós-graduação, que dá acesso total.

Entregue em 4 levas, todas **em produção**. A integração com o gateway
(liberação automática por webhook) é a leva 3 e **ainda não existe** — hoje a
concessão é manual.

---

## 2. Estado verificado em produção

| Alvo | Estado |
|---|---|
| Backend | Revisão **`00107-zg5`**, 100% do tráfego |
| Frontend | Vercel **`7708f75`** em Production (2026-08-14T03:05Z) |
| Login | Verificado em `app.` e `www.` |
| Gate de acesso | Validado com aluno real: vitrine libera as aulas dela, resto corta em 2 min |
| Cobertura de acesso | 30 usuários vivos, **0 sem acesso** |

**Histórico de revisões da rodada:** `00104-vw2` (CORS) → `00105-rl5`
(gate + grandfather) → `00106-c5j` (fix do preview/Enrollment) →
`00107-zg5` (herança de capa).

---

## 3. O que mudou **fora** do repo

### 3.1 Dados de produção (⚠️ invisível no `git log`)

| Mudança | Detalhe |
|---|---|
| **Grandfather aplicado** | Vitrine `Acesso completo (legado)` (`grantsAllContent = true`, `isPublished = false`) + **30 `Entitlement`** com `source = GRANDFATHER`, `expiresAt = null`. Script: `backend-api/scripts/grandfather-entitlements.ts`. Sem isso, os 30 alunos perderiam acesso ao ligar o gate. |
| **Limpeza de preview** | 3 `Progress` indevidos removidos, 2 percentuais de `Enrollment` recalculados. Script: `backend-api/scripts/cleanup-preview-enrollments.ts`. Idempotente (2ª rodada = 0). |
| **Backfill de `firebaseUid`** | 30/30 usuários com UID gravado. Script: `backend-api/scripts/backfill-firebase-uid.ts`. |
| **Vitrine de produção** | `castracao-descomplicada` — 19 aulas do módulo `Castração Descomplicada - Gravado`, publicada, `externalProductId = 7480227495418253312` (TheMembers). |

### 3.2 ⚠️ Conta em estado de teste — NÃO é bug

**`gustavobressnin6@gmail.com`** está com o `Entitlement` de grandfather
**revogado** e a vitrine de castração concedida (`source = ADMIN`). Foi
montado assim de propósito, para validar o comportamento de comprador de
recorte.

Se essa conta reclamar de acesso limitado, é isto. Restaurar:

```sql
UPDATE entitlements e SET "revokedAt" = NULL, "revokedReason" = NULL
FROM users u WHERE e."userId" = u.id
  AND u.email = 'gustavobressnin6@gmail.com' AND e.source = 'GRANDFATHER';
```

A outra conta (`gustavobressanin6@gmail.com`) segue com acesso total.

### 3.3 Consoles

Nada novo nesta rodada além do que já está em
`docs/HANDOFF-2026-08-11-pre-live-execucao.md` §4 (`CORS_ORIGINS` com o
domínio canônico, limpeza do bucket de staging).

---

## 4. O que mudou **dentro** do repo

Todos os commits com autoria `xoiurp`, merge por rebase.

| Leva | Commits | Entrega |
|---|---|---|
| **1** | `6513f6c` `d983bef` | Guard por `firebaseUid`; modelo (`Showcase`, `ShowcaseVideo`, `Entitlement`, `WebhookEvent`) + admin de composição |
| **2** | `5ebef64` `b7985d5` `0d68877` `d866223` | Testes do service; script de grandfather; gate de leitura (`hasAccess` por aula); preview nos players |
| **2.5** | `0046083` `07b3789` `d7b035e` `be84980` `aa6a68d` | Fix do preview criando `Enrollment`; script de limpeza; seção "Meus Cursos" na Explorar (web + mobile) |
| **2.6** | `2e0205f` `7708f75` | Herança da capa a partir do módulo; campo de capa no admin |

Spec: `a837e91`. Total de testes do backend: **290**.

---

## 5. Decisões de produto (tomadas nesta rodada)

| Decisão | Detalhe |
|---|---|
| Composição da vitrine | **Lista explícita** de vídeos, com atalho "adicionar módulo inteiro" que materializa as linhas |
| Navegação | Continua por curso. A seção "Meus Cursos" vive **só** na Explorar (`/student/courses`) |
| `/student/my-courses` | **Mantida como estava** — lista matrículas, não vitrines (revertida em `aa6a68d`) |
| Preview | 2 min, ou `min(120s, 50% da duração)` para aulas curtas |
| Nível de proteção | **1** — corte no player. Risco aceito, ver §7 |
| Pós-graduação / grandfather | Via `grantsAllContent`, sem materializar 1.394 linhas. Não vira card no aluno |
| Capa da vitrine | Herda do módulo da primeira aula; capa própria sobrescreve |

---

## 6. Pendências abertas

| # | Item | Onde / detalhe |
|---|---|---|
| **P1** | **Leva 3 — webhook TheMembers.** Hoje a liberação é manual. Pré-requisito (`firebaseUid`) **já está em produção**, então está desbloqueada. Eventos: `release.access` / `revoke.access`; validação HMAC-SHA256 sobre `rawBody` no header `X-Signature` | §5 do design |
| **P2** | **Mobile sem validação em aparelho** — 3 levas seguidas. Código com paridade verificada e `tsc` limpo, mas o smoke autenticado segue bloqueado para agentes (sem credencial de teste no Firebase de prod). Destrava criando uma conta de teste dedicada | `mobile-app/` |
| **P3** | **Consumidores de `Enrollment` não revisados.** `Enrollment` agora tem duas leituras possíveis ("começou" vs "tem direito") e só corrigimos os pontos que apareceram. **Gamificação, certificados e relatórios de presença** ainda leem sem saber disso | backend |
| **P4** | "Primeira aula" da herança de capa resolve por `addedAt, videoId` — determinístico, mas o desempate é por UUID, não pedagógico. Irrelevante hoje (vitrine de um módulo só); quando cruzar módulos, a capa vira sorteio. Mitigação: capa própria | `showcases.service.ts` |
| **P5** | Progresso por vitrine ("7 de 19 aulas") não existe | — |

Seguem válidas as pendências de `docs/HANDOFF-2026-08-11-pre-live-execucao.md`
§5.4 (M1 a M10), **exceto** o A7 e o M7, que foram fechados.

---

## 7. Riscos aceitos

| Risco | Decisão |
|---|---|
| **Preview contornável.** Nível 1: a URL do `playlist.m3u8` completo continua indo ao cliente e o objeto no R2 é público. Aluno com DevTools assiste a aula inteira | Aceito em 2026-08-12. Níveis 1 e 2 compartilham quase todo o trabalho — subir depois é barato. Reabre com evidência de link circulando |
| **Vínculo produto↔vitrine digitado à mão** | Aceito. O admin exibe `product.name` do primeiro evento recebido para conferência |

---

## 8. Gotchas novos desta rodada

1. **`createMany` grava todas as linhas com o mesmo `addedAt`.** Em produção,
   as 19 aulas da vitrine ficaram no mesmo milissegundo. Qualquer ordenação
   por `addedAt` **precisa** de desempate (`videoId`), senão o resultado muda
   entre carregamentos.
2. **Uma feature nova muda o significado de algo antigo, e o lugar antigo
   continua com a definição velha.** Aconteceu 3× nesta rodada: `grantsAllContent`
   contando como cobertura de órfãs; `CORS_ORIGINS` sem o domínio novo;
   `Enrollment` criado por preview. Ao introduzir um conceito, procurar quem já
   lê o conceito antigo — é a origem do P3.
3. **Fail-open é o que permite deployar front antes do backend.** O tipo
   `hasAccess?: boolean` com checagem `=== false` (estrito) faz o front tratar
   ausência como liberado. Isso valeu para a leva 2. **Não valeu para a 2.5**,
   que introduziu endpoint novo (`/showcases/mine`) — ali o backend tem que ir
   primeiro, senão a seção quebra com 404.
4. **O token do `gcloud` expira em ~2h nesta conta.** Bloqueou 3 ações em
   13-14/08. Ver também §6.7 e §6.8 do handoff anterior (proxy zumbi).

---

## 9. Como continuar

```bash
# Estado
git log --oneline -12
docker start projeto-cirurgiao-postgres projeto-cirurgiao-redis
cd backend-api && npm test          # esperado: 290/290

# Sondas de produção (read-only)
curl -o /dev/null -w "%{http_code}\n" https://projeto-cirurgiao-api-81746498042.southamerica-east1.run.app/api/v1/health
curl -o /dev/null -w "%{http_code}\n" https://app.projetocirurgiao.app/

# Banco de produção (read-only) — ver gotchas §6.7/§6.8 do handoff anterior
gcloud auth login
backend-api/cloud-sql-proxy.exe --token "$(gcloud auth print-access-token)" \
  --port 5434 projeto-cirurgiao-e8df7:southamerica-east1:cirurgiao-db
```

**Regras que valeram e continuam valendo:**

- Commit sempre com `--author='xoiurp <102543650+xoiurp@users.noreply.github.com>'`;
  merge de PR com `gh pr merge --rebase`.
- Script que grava em produção: **dry-run por padrão**, `--apply` explícito, e
  idempotente. Os três desta rodada seguem esse padrão e funcionaram.
- Mudança em dados ou consoles de produção: **registrar aqui** (§3) — é a
  única forma de o próximo agente saber que aconteceu.

---

*Rodada anterior: `docs/HANDOFF-2026-08-11-pre-live-execucao.md`.
Design desta feature: `docs/plans/2026-08-12-vitrines-controle-acesso-design.md`.*
