# Plano — Re-embedding do Tobias em português (RAG Biblioteca)

> **Status:** PLANO. **Nada executado.** Sem mutação em prod, sem chamada de embedding,
> sem alteração de bucket/DB. Implementação (dry-run primeiro) fica para etapa seguinte,
> após aprovação.

## 1. Estado atual confirmado (evidência de dados, 2026-07-02)

| Documento | lang | status | chunks | indexed | with_embedding | translated | with_contentpt |
|---|---|---|---|---|---|---|---|
| Fossum (4ª Ed.) | pt-BR | COMPLETED | 4620 | 4620 | 4620 | 0 | 0 |
| **Tobias (2nd Ed.)** | en | COMPLETED | 6161 | 6161 | 6161 | **0** | **0** |

- **Bucket OK:** `Fossum...pdf` e `Veterinary Surgery, Small Animal, 2nd - Tobias.pdf` presentes em `gs://projeto-cirurgiao-knowledge-base/books/`. Não há "Tobias traduzido" como arquivo (por design, tradução é no DB).
- **Causa raiz:** Tobias está indexado com **embeddings gerados do inglês** e **`contentPt` NULL**. Perguntas em português casam melhor com Fossum (embeddado em PT) → Fossum domina o top-K.
- **A tradução existe:** `C:\Users\Pichau\Desktop\traducoes_exportadas.csv` — 10.781 linhas, **100% com `contentPt`**, distribuição `en: 6161` (Tobias) + `pt-BR: 4620` (Fossum). Bate 1:1 com as contagens do DB. **O `contentPt` foi perdido do banco** (provável reprocessamento por `scripts/process-books.ts`, que não traduz).

**Objetivo do fix:** trazer o Tobias ao mesmo padrão do Fossum — `contentPt` populado + embeddings gerados do **português** — sem re-traduzir (a tradução já existe no CSV).

## 2. Pré-condições (confirmar antes do apply)

- [ ] **Backup** dos chunks do Tobias antes de qualquer escrita (ver §6). Preferir também snapshot lógico do Cloud SQL (`gcloud sql backups create`), com autorização.
- [ ] **CSV:** caminho `C:\Users\Pichau\Desktop\traducoes_exportadas.csv`; colunas exatas `chunkIndex,chapter,chapterPt,content,contentPt,language,pageStart,pageEnd`. Encoding UTF-8, campos com quebras de linha (usar parser CSV real, não split por vírgula/linha).
- [ ] **Matching 1:1:** discriminador do Tobias no CSV = `language == 'en'` (6161 rows). Chave de junção = `chunkIndex` → chunk do Tobias com mesmo `chunkIndex`. **Validar alinhamento** comparando `content` do CSV vs `content` no DB por `chunkIndex` (amostra + contagem de divergências); abortar se houver desalinhamento.
- [ ] **id do KnowledgeDocument Tobias:** resolver por lookup (não hardcode):
  ```sql
  SELECT id, title, "totalChunks" FROM knowledge_documents
  WHERE title ILIKE '%Tobias%' OR "fileName" ILIKE '%Tobias%';
  ```
  Esperado: 1 linha, `totalChunks = 6161`.
- [ ] **Modelo de embedding:** o mesmo em uso hoje — `text-embedding-004` (`VERTEX_EMBEDDING_MODEL`), dimensão **768** (coluna `vector(768)`). Reusar para os vetores serem comparáveis com o Fossum. **Não trocar de modelo.**
- [ ] **Acesso:** Cloud SQL via Auth Proxy (ADC reauthada) + senha do usuário `app_cirurgiao` **do Secret Manager** (`DATABASE_URL`) — as credenciais comentadas no `.env` estão **stale**. Nunca imprimir a senha.

## 3. Script proposto

Local: `backend-api/scripts/reembed-tobias.ts` (TypeScript, reutiliza serviços do backend).

### 3.1 `--dry-run` (obrigatório, default)
- Lê o CSV com parser real; filtra `language == 'en'` (Tobias).
- Resolve o documentId do Tobias por título.
- Valida:
  - contagem CSV-en == `totalChunks` do Tobias (6161);
  - todo chunk do DB tem par no CSV por `chunkIndex` (e vice-versa);
  - todo `contentPt` do CSV não-vazio;
  - **alinhamento:** `content` do CSV ≈ `content` do DB por `chunkIndex` (report de N divergências; se > limiar, ABORTA).
- **Não escreve nada.** Saída: contagens, ids, nº de divergências, amostra de `chunkIndex` (sem conteúdo de livro).

### 3.2 `--apply` (separado, explícito, gated)
Por chunk do Tobias (em lotes):
1. `UPDATE knowledge_chunks SET "contentPt"=$pt, "chapterPt"=$chpt, "isTranslated"=true WHERE "documentId"=$tobias AND "chunkIndex"=$i` (campos não-vetoriais via Prisma).
2. Gerar embedding **de `contentPt`** (reusar `KnowledgeSearchService.generateEmbedding`, `text-embedding-004`).
3. `UPDATE knowledge_chunks SET embedding=$vec::vector, "isIndexed"=true WHERE id=$id` (vetor via raw SQL, como faz a ingestion service).
- Flags: `--limit N` (piloto), `--batch-size` (default 50), `--start-index` (checkpoint/retomada).
- **Logs só com contagens/ids/progresso/ETA** — nunca trecho de livro.

## 4. Estratégia de embeddings
- **Não reprocessar o Fossum** (já correto em PT). Escopo estrito = documentId do Tobias.
- **Regerar só o Tobias** a partir de `contentPt`.
- **Batches com checkpoint + retry** (retry exponencial em erro de API, como `process-books.ts`). `--start-index` permite retomar sem refazer.
- **Reutilizar** o serviço de embedding existente (mesma auth/modelo/dimensão).
- `--limit` para **piloto** (ex.: 50 chunks) e medir custo/tempo/qualidade antes do lote completo (6161 chunks ≈ mesma ordem de grandeza do processamento original).
- **Estado durante a reindexação (escolher):**
  - **A (recomendado):** manter `isIndexed=true` — durante o processo, o Tobias fica com mistura EN(antigo)/PT(novo); resultados só melhoram. Zero downtime.
  - **B (mais limpo):** setar `isIndexed=false` no Tobias no início (sai da busca), reembedar, e `isIndexed=true` no fim — Tobias some da busca durante a janela.

## 5. Validação (pós-apply, read-only)
- Repetir a query de contagem — esperado para o Tobias:
  - `with_contentpt = 6161`, `translated = 6161`, `with_embedding = 6161`, `indexed = 6161`.
- **Testes RAG** com perguntas cuja resposta deveria vir do Tobias (tópicos cobertos por ele; idealmente algo que o Fossum cobre pouco). Confirmar:
  - `message.sources` contém **"Veterinary Surgery, Small Animal - Tobias (2nd Edition)"**;
  - similaridade dos chunks Tobias sobe (comparável ao Fossum) para query PT.
- Sanidade: dimensão dos novos vetores = 768; nenhum embedding nulo no Tobias.

## 6. Rollback
Antes do apply, **exportar o estado atual do Tobias** para arquivo local (fora do repo, gitignored):
```sql
-- backup lógico dos campos que serão alterados
SELECT id, "chunkIndex", "contentPt", "chapterPt", "isTranslated", "isIndexed",
       embedding::text AS embedding_txt
FROM knowledge_chunks
WHERE "documentId" = '<tobias-id>'
ORDER BY "chunkIndex";
```
- **Restaurar:** re-aplicar os valores do backup (contentPt/chapterPt/isTranslated/isIndexed via Prisma; `embedding` via `::vector` a partir de `embedding_txt`).
- Alternativa/complemento: **snapshot Cloud SQL** (`gcloud sql backups create`) antes do apply + restore de backup se necessário.
- O CSV é a fonte da tradução; o backup preserva os embeddings EN antigos caso seja preciso reverter 100%.

## 7. Riscos
- **CSV desalinhado** (ordem/índice diferente do DB) → mitigado pela validação de `content` no dry-run (aborta se divergir).
- **Embeddings parciais** por interrupção → mitigado por checkpoint (`--start-index`) + a query de validação (`with_embedding` deve fechar 6161).
- **Mistura de embeddings antigos/novos** durante a janela → aceitável (estratégia A) ou evitável (estratégia B com `isIndexed=false`).
- **Custo/tempo** de 6161 embeddings (Vertex) → medir com `--limit` piloto; rodar em lotes com pausa (rate limit).
- **Uso da biblioteca durante a reindexação** → se quiser janela limpa, usar estratégia B ou avisar que resultados do Tobias ficam transitórios.
- **Credenciais/segredos** → senha só do Secret Manager, nunca em log/commit; CSV nunca commitado (contém conteúdo de livro).

## 8. Não executar (nesta etapa)
- Não rodar o script. Não alterar DB/bucket. Não chamar embeddings. Não commitar o CSV.
- Próxima etapa: implementar `reembed-tobias.ts` com **`--dry-run` primeiro**, validar contra prod (read-only), e só então `--apply` com autorização explícita + backup.
