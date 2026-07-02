/**
 * DRY-RUN do re-embedding do Tobias (RAG Biblioteca). NÃO escreve no banco,
 * NÃO gera embeddings. Ver docs/plans/2026-07-02-rag-tobias-reembedding-plan.md.
 *
 * Uso (read-only; requer Cloud SQL proxy + DATABASE_URL apontando pra prod):
 *   DATABASE_URL="postgresql://app_cirurgiao:***@127.0.0.1:5434/projeto_cirurgiao" \
 *   npx tsx scripts/reembed-tobias.ts --csv "C:\\Users\\Pichau\\Desktop\\traducoes_exportadas.csv"
 *
 * `--apply` é explicitamente rejeitado nesta versão.
 *
 * Nenhum conteúdo de livro é impresso — só contagens/ids/flags.
 */
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import {
  parseCsvRecords,
  filterTobias,
  validateCsvRows,
  checkAlignment,
  buildSummary,
  isDryRunClean,
  DbChunk,
} from '../src/modules/ai-library/services/tobias-reembed-planner';

const EXPECTED_TOBIAS_CHUNKS = 6161;

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  if (process.argv.includes('--apply')) {
    console.error('--apply is not implemented in this dry-run version');
    process.exit(1);
  }

  const csvPath = getArg('--csv');
  if (!csvPath) {
    console.error('Uso: reembed-tobias.ts --csv <caminho-do-traducoes_exportadas.csv>');
    process.exit(1);
  }
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV não encontrado no caminho informado.`);
    process.exit(1);
  }

  console.log('=== DRY-RUN reembed Tobias (nenhuma escrita, nenhum embedding) ===');

  // 1. CSV → registros → filtra Tobias (language=en)
  const text = fs.readFileSync(csvPath, 'utf8');
  const records = parseCsvRecords(text);
  const tobias = filterTobias(records);

  // 2. Validações de CSV
  const csvVal = validateCsvRows(tobias, EXPECTED_TOBIAS_CHUNKS);

  // 3. Lookup do documento Tobias no DB (sem hardcode de id)
  const prisma = new PrismaClient();
  try {
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

    // 4. Carrega chunks do Tobias (só chunkIndex + content, sem contentPt)
    const dbChunks: DbChunk[] = (
      await prisma.knowledgeChunk.findMany({
        where: { documentId: doc.id },
        select: { chunkIndex: true, content: true },
      })
    ).map((c) => ({ chunkIndex: c.chunkIndex, content: c.content }));

    // 5. Alinhamento CSV vs DB por chunkIndex
    const align = checkAlignment(tobias, dbChunks);

    // 6. Relatório — SÓ contagens
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

    const clean = isDryRunClean(csvVal, align);
    if (clean) {
      console.log('✅ DRY-RUN OK — CSV e DB alinhados; apto para apply futuro.');
      process.exit(0);
    } else {
      console.error('❌ DRY-RUN ABORTADO — divergência detectada (ver flags acima).');
      process.exit(2);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Erro no dry-run:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
