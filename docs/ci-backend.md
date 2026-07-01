# CI do backend (`backend-ci.yml`)

Cobre **P1.3** (gate de build/test) e **P1.11** (secret scanning) do checklist go-live.
Roda em `push` para `main` e em todo `pull_request`. **Não faz deploy.**

## Jobs

### `build-test`
`ubuntu-latest`, Node 20, dentro de `backend-api/`:

1. `npm ci`
2. `npx prisma generate`
3. `npm run build` (bloqueante)
4. `npx prisma migrate deploy` — aplica o schema no Postgres do CI
5. `npm run db:seed:specialties` — seed do `xp_rules` (necessário pros testes de gamificação)
6. `npm test -- --runInBand` (suíte completa, sem exclusões)

**Postgres do CI:** service container `pgvector/pgvector:pg15` (não `postgres` puro), porque
a migration `20260418021654_add_pgvector_embeddings` faz `CREATE EXTENSION vector` e usa `vector(768)`.
Mapeado em `localhost:5433` pra bater com o `DATABASE_URL` que os specs esperam. É um banco
descartável com credencial pública — **não é secret**, por isso fica inline no YAML.

Reprodutível no CI sem depender do Docker local do dev.

### `secret-scan`
`gitleaks/gitleaks-action@v2` com `fetch-depth: 0` (varre o histórico inteiro, não só o diff).
**Bloqueante:** PR/push com segredo detectado falha o check.

## Histórico: quarentena removida

O commit que introduziu este CI (`7dc1511`) rodava a suíte com
`--testPathIgnorePatterns` excluindo `videos.service.spec` e `modules.service.spec`, que tinham
falhas **pré-existentes e não relacionadas a banco**:

| Suite | Falha original | Causa |
|---|---|---|
| `videos.service.spec` | 52/52 | Setup do TestingModule sem provider `ConfigService` (erro de DI do Nest). |
| `modules.service.spec` | 2/21 | Mock de Prisma incompleto no `reorder`: `module.findMany`/`$transaction` não mockados. |

Ambas foram **corrigidas** (mocks explícitos no setup dos specs, sem alterar os services nem relaxar
assertions) e a quarentena foi **removida**. A suíte roda completa e bloqueante, incluindo os testes
de integração `xp`/`xp-calculator` que usam o Postgres do CI.

## Caveats conhecidos

- **gitleaks + histórico:** o scan varre todos os commits. Se algum segredo foi commitado no
  passado, o job vai falhar (é o comportamento desejado — surfacear). Se aparecer um achado
  histórico já tratado/aceito, registrar em `.gitleaksignore` (fingerprint) ou purgar o histórico;
  não silenciar o job inteiro.
- **Licença gitleaks:** a action v2 é gratuita para repositórios de conta pessoal. Em conta de
  organização exige `GITLEAKS_LICENSE` — ajustar se o repo migrar de owner.
- **Sem deploy:** promoção pra produção continua manual e gated no Gustavo.
