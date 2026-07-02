/**
 * Re-embedding do Tobias (RAG Biblioteca). DRY-RUN por padrão; --apply é
 * fortemente travado. Ver docs/plans/2026-07-02-rag-tobias-reembedding-plan.md.
 *
 * Uso (read-only; requer Cloud SQL proxy + DATABASE_URL apontando pra prod):
 *   DATABASE_URL="postgresql://app_cirurgiao:***@127.0.0.1:5434/projeto_cirurgiao" \
 *   npx tsx scripts/reembed-tobias.ts --csv "C:\\...\\traducoes_exportadas.csv"
 *
 * APPLY (mutação; só com backup + confirmação; executar apenas autorizado):
 *   ... --apply --csv <csv> --backup <path.jsonl> --confirm-tobias-prod \
 *       --batch-size 50 [--limit N] [--start-index N]
 *
 * Nunca imprime conteúdo de livro (content/contentPt) nem segredo — só contagens/ids/status.
 */
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { KnowledgeSearchService } from '../src/modules/ai-library/services/knowledge-search.service';
import {
  parseCsvRecords,
  filterTobias,
  validateCsvRows,
  checkAlignment,
  buildSummary,
  isDryRunClean,
  parseApplyArgs,
  validateApplyArgs,
  pickBackupFields,
  planBatches,
  CsvRecord,
  DbChunk,
} from '../src/modules/ai-library/services/tobias-reembed-planner';

const EXPECTED_TOBIAS_CHUNKS = 6161;

interface FullDbChunk {
  id: string;
  chunkIndex: number;
  content: string;
  contentPt: string | null;
  chapterPt: string | null;
  isTranslated: boolean;
  isIndexed: boolean;
  embedding: string | null;
}

async function loadTobiasChunks(prisma: PrismaClient, documentId: string): Promise<FullDbChunk[]> {
  return (await prisma.$queryRawUnsafe(
    `SELECT id, "chunkIndex", content, "contentPt", "chapterPt",
            "isTranslated", "isIndexed", embedding::text AS embedding
     FROM knowledge_chunks WHERE "documentId" = $1 ORDER BY "chunkIndex"`,
    documentId,
  )) as FullDbChunk[];
}

async function main() {
  const args = parseApplyArgs(process.argv);

  if (args.apply) {
    const errs = validateApplyArgs(args);
    if (errs.length > 0) {
      console.error('--apply BLOQUEADO — faltam travas obrigatórias:');
      errs.forEach((e) => console.error(`  - ${e}`));
      process.exit(1);
    }
  }

  if (!args.csv) {
    console.error('Uso: reembed-tobias.ts --csv <caminho-do-traducoes_exportadas.csv>');
    process.exit(1);
  }
  if (!fs.existsSync(args.csv)) {
    console.error('CSV não encontrado no caminho informado.');
    process.exit(1);
  }

  const mode = args.apply ? 'APPLY' : 'DRY-RUN';
  console.log(`=== reembed Tobias [${mode}] ===`);

  // 1. CSV → registros → filtra Tobias (language=en)
  const records = parseCsvRecords(fs.readFileSync(args.csv, 'utf8'));
  const tobias = filterTobias(records);
  const csvVal = validateCsvRows(tobias, EXPECTED_TOBIAS_CHUNKS);

  const prisma = new PrismaClient();
  try {
    // 2. Lookup do documento Tobias (sem hardcode de id)
    const doc = await prisma.knowledgeDocument.findFirst({
      where: {
        OR: [
          { title: { contains: 'Tobias', mode: 'insensitive' } },
          { fileName: { contains: 'Tobias', mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, language: true, status: true, totalChunks: true },
    });
    if (!doc) {
      console.error('Documento Tobias não encontrado no DB.');
      process.exit(1);
    }
    console.log(
      `Documento Tobias: id=${doc.id} language=${doc.language} status=${doc.status} totalChunks=${doc.totalChunks}`,
    );

    // 3. Carrega chunks do DB (completos — usados no backup do apply)
    const full = await loadTobiasChunks(prisma, doc.id);
    const dbChunks: DbChunk[] = full.map((c) => ({ chunkIndex: c.chunkIndex, content: c.content }));

    // 4. Validações (dry-run e apply compartilham). Aborta em divergência.
    const align = checkAlignment(tobias, dbChunks);
    const summary = buildSummary(csvVal, dbChunks.length, align);
    console.log('--- SUMMARY (contagens) ---');
    console.log(JSON.stringify(summary, null, 2));
    console.log('--- Flags de validação ---');
    console.log(
      JSON.stringify(
        {
          csv_countOk: csvVal.countOk,
          csv_uniqueOk: csvVal.uniqueOk,
          csv_duplicateIndexes: csvVal.duplicateIndexes.length,
          csv_missingChunkIndex: csvVal.missingChunkIndex,
          csv_missingContent: csvVal.missingContent,
          align_onlyInCsv: align.onlyInCsv.length,
          align_onlyInDb: align.onlyInDb.length,
          align_mismatches: align.mismatches,
        },
        null,
        2,
      ),
    );

    if (!isDryRunClean(csvVal, align)) {
      console.error('❌ ABORTADO — divergência detectada (ver flags acima). Nada foi alterado.');
      process.exit(2);
    }

    if (!args.apply) {
      console.log('✅ DRY-RUN OK — CSV e DB alinhados; apto para apply futuro.');
      process.exit(0);
    }

    // =========================== APPLY ===========================
    // 5. Backup ANTES de qualquer escrita (JSONL, só campos permitidos)
    console.log(`Backup: exportando ${full.length} chunks do Tobias para ${args.backup} ...`);
    const backupLines = full.map((c) => JSON.stringify(pickBackupFields(c)));
    fs.writeFileSync(args.backup!, backupLines.join('\n') + '\n', 'utf8');
    console.log(`Backup gravado: ${backupLines.length} registros.`);

    // 6. Mapas do CSV por chunkIndex → tradução
    const csvByIdx = new Map<number, CsvRecord>();
    for (const r of tobias) csvByIdx.set(parseInt(r.chunkIndex.trim(), 10), r);
    const idByIdx = new Map<number, string>();
    for (const c of full) idByIdx.set(c.chunkIndex, c.id);

    // 7. Batches (respeita --start-index / --limit / --batch-size)
    const batches = planBatches(full.map((c) => c.chunkIndex), args.batchSize!, {
      startIndex: args.startIndex,
      limit: args.limit,
    });
    const totalToUpdate = batches.reduce((n, b) => n + b.length, 0);
    console.log(
      `APPLY: ${totalToUpdate} chunks em ${batches.length} batches de até ${args.batchSize}` +
        (args.limit ? ` (limit=${args.limit})` : '') +
        (args.startIndex ? ` (start-index=${args.startIndex})` : ''),
    );

    const embedder = new KnowledgeSearchService(new ConfigService() as any, prisma as any);
    let phaseADone = 0;
    let phaseBDone = 0;

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      const lo = batch[0];
      const hi = batch[batch.length - 1];
      try {
        // Fase A: contentPt/chapterPt/isTranslated (NÃO toca content EN).
        for (const idx of batch) {
          const rec = csvByIdx.get(idx)!;
          await prisma.knowledgeChunk.update({
            where: { documentId_chunkIndex: { documentId: doc.id, chunkIndex: idx } },
            data: { contentPt: rec.contentPt, chapterPt: rec.chapterPt || null, isTranslated: true },
          });
          phaseADone++;
        }
        // Fase B: regenerar embedding a partir de contentPt e salvar.
        for (const idx of batch) {
          const rec = csvByIdx.get(idx)!;
          const id = idByIdx.get(idx)!;
          const vec = await embedder.generateEmbedding(rec.contentPt);
          await prisma.$executeRawUnsafe(
            `UPDATE knowledge_chunks SET embedding = $1::vector, "isIndexed" = true WHERE id = $2`,
            `[${vec.join(',')}]`,
            id,
          );
          phaseBDone++;
        }
        console.log(
          `  batch ${b + 1}/${batches.length} chunkIndex ${lo}..${hi} — A=${phaseADone} B=${phaseBDone}`,
        );
      } catch (err) {
        console.error(
          `❌ APPLY interrompido no batch ${b + 1}/${batches.length} (chunkIndex ${lo}..${hi}). ` +
            `A=${phaseADone} B=${phaseBDone}. Retomar com --start-index ${lo}. ` +
            `Motivo: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(3);
      }
    }

    console.log(`✅ APPLY concluído — Fase A=${phaseADone}, Fase B=${phaseBDone} de ${totalToUpdate}.`);
    process.exit(0);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Erro:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
