# Plano: quota persistente de gerações de resumo por IA

> **Status:** plano aprovado para escrita, implementação pendente de autorização.
> **Origem:** smoke pós-deploy da rev `00100-2rx` (2026-07-22) — o fix de resumo incompleto
> (commit `89b8744`) revelou um caso-limite antigo na contagem de gerações.
> **Escopo:** backend only (`ai-summaries`). Sem mudança de contrato de API para os fronts.

---

## 1. Problema

Regra de produto: **3 gerações de resumo por aula por aluno**, e **deletar um resumo não
devolve a geração**.

Hoje a contagem de gerações consumidas é derivada das linhas vivas de `VideoSummary`
(`MAX(generationCount)` — gate em `generateSummary`, leitura em `getRemainingGenerations`
e `listSummaries`). Como o delete de `VideoSummary` é **hard delete**, se o aluno deletar
**todos** os resumos de um vídeo, o histórico desaparece e a quota reseta para 0 — ele pode
gerar 3 novos resumos, indefinidamente.

Enquanto restar ≥ 1 linha, a regra funciona (o `generationCount` mais alto sobrevive nas
linhas restantes). O gap só ocorre no delete da última linha.

**Não é regressão** do patch `89b8744`: o comportamento anterior (contagem por `COUNT(*)`)
tinha o mesmo reset — e era pior, pois devolvia geração a cada delete individual.

## 2. Causa raiz

O contador de consumo vive **dentro do recurso deletável**. Qualquer contagem derivada de
`VideoSummary` morre junto com a última linha. A correção é persistir o consumo em um
registro **independente do ciclo de vida dos resumos**.

## 3. Proposta de schema

Novo model Prisma (seguindo convenção de `@@map` snake_case do projeto):

```prisma
model VideoSummaryGenerationQuota {
  id              String   @id @default(uuid())
  userId          String
  videoId         String
  generationCount Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  video Video @relation(fields: [videoId], references: [id], onDelete: Cascade)

  @@unique([userId, videoId])
  @@map("video_summary_generation_quotas")
}
```

Notas:
- `@@unique([userId, videoId])` — uma linha de quota por aluno×aula; o upsert concorre
  com segurança sobre essa chave.
- `onDelete: Cascade` no `Video`: se a **aula** for hard-deletada do catálogo, a quota
  morre junto (aceitável — a aula não existe mais). Soft-delete de vídeo (`deletedAt`)
  não toca a quota.
- `generationCount` na quota é a fonte de verdade; o campo homônimo em `VideoSummary`
  permanece (metadado da linha, usado no backfill), sem breaking change.

## 4. Fluxo em `generateSummary`

1. **Gate (pré-Vertex):** ler quota por `userId+videoId`; se `generationCount >= 3`,
   lançar `BadRequestException` de limite (mensagem atual). Sem linha de quota = 0 usado.
2. Buscar VTT, gerar no Vertex, **validar completude** (vazio / `finishReason !== STOP` /
   sentinela ausente → rejeita; comportamento já em produção). Falha aqui **não toca a
   quota** — nada de incremento antecipado.
3. **Transação** (`prisma.$transaction`):
   a. Incremento condicional da quota — guard contra corrida de requisições simultâneas:
      `updateMany({ where: { userId, videoId, generationCount: { lt: 3 } }, data: { generationCount: { increment: 1 } } })`;
      se `count === 0` e não existir linha, `create` com `generationCount: 1` (o unique
      composto derruba o segundo criador concorrente); se `count === 0` com linha existente,
      abortar com erro de limite (outra requisição consumiu a última geração no meio-tempo).
   b. `videoSummary.create` com a versão/slot calculados (lógica de buracos mantida).
   Falha em qualquer passo → rollback dos dois (resumo sem quota ou quota sem resumo
   nunca persistem).
4. `remainingGenerations` da resposta, `getRemainingGenerations` e `listSummaries` passam
   a ler da tabela de quota (shape de resposta dos endpoints **inalterado** — fronts não mudam).

## 5. Delete

`deleteSummary` continua apagando a linha de `VideoSummary` normalmente e **não toca** a
tabela de quota. Deletar 1, N ou todos os resumos não devolve geração — em qualquer ordem.

## 6. Migração e backfill

Uma migration com dois passos (forward-only, padrão do projeto):

1. `CREATE TABLE video_summary_generation_quotas` + unique index.
2. Backfill no mesmo arquivo SQL:

```sql
INSERT INTO video_summary_generation_quotas (id, "userId", "videoId", "generationCount", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "userId", "videoId", MAX("generationCount"), NOW(), NOW()
FROM video_summaries
GROUP BY "userId", "videoId";
```

**Limitação histórica aceita:** quem já deletou todos os resumos de um vídeo antes desta
migration não tem linhas para reconstruir o consumo — entra com quota zerada. Perda
pontual e não recuperável; documentada aqui como risco aceito.

O backfill roda no Job `cirurgiao-api-migrator` (pipeline padrão de deploy); é idempotente
por construção só na primeira aplicação — como migrations Prisma aplicam uma única vez,
não há re-execução.

## 7. Rollback

- **App:** reverter tráfego para a revision anterior (runbook §1). A revision antiga ignora
  a tabela nova — nenhuma incompatibilidade de schema (tabela aditiva, nenhum campo
  alterado/removido).
- **Schema:** forward-only, como todo o projeto (`docs/RUNBOOK-ROLLBACK.md`). A tabela fica
  órfã e inofensiva até um eventual re-deploy.
- **Dado:** a quota nunca decrementa, então rollback de app não corrompe contagem; ao
  voltar a revision nova, a quota segue válida.

## 8. Testes obrigatórios

Em `ai-summaries.service.spec.ts` (mocks Prisma, padrão atual):

1. 3 gerações consumidas bloqueiam a 4ª (gate lê a quota, Vertex não é chamado).
2. Deletar todos os resumos **não** devolve quota (`getRemainingGenerations` continua `used=3`).
3. Geração inválida (MAX_TOKENS / sentinela ausente / vazio) **não** incrementa quota.
4. Geração válida cria `VideoSummary` **e** incrementa quota na mesma transação (ambas as
   escritas dentro do mesmo `$transaction`; falha em uma reverte a outra).
5. Backfill usa `MAX(generationCount)` por `userId+videoId` (teste do SQL via spec dedicado
   ou verificação manual documentada no PR, dado que migrations não têm harness de teste hoje).
6. Corrida: duas gerações simultâneas com 2/3 consumidas → apenas uma passa (guard `lt: 3`).

Smoke pós-deploy: reutilizar `backend-api/scripts/smoke-prod-summary.ts` (local, gitignored),
que já cobre o cenário — o check "deletar não devolveu geração" que falha hoje passará.

## 9. Fora de escopo

- Mudar o limite de 3 gerações (fica na constante atual).
- Soft-delete de `VideoSummary`.
- UI web/mobile — nenhum contrato de API muda.
- Retroagir quota de quem já explorou o reset (limitação histórica, §6).
