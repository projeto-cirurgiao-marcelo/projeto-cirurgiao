/**
 * Rollback pontual dos chunks do Tobias alterados no piloto (RAG Biblioteca).
 * DRY-RUN por padrão; --apply travado. Restaura chunkIndex 0..--max-index a
 * partir do backup JSONL gerado por reembed-tobias.ts --apply.
 *
 * Uso (dry-run, local — só lê o backup):
 *   npx tsx scripts/rollback-tobias.ts --backup "D:\\dashboard\\tobias-backup-....jsonl"
 *
 * Apply (mutação; requer proxy + DATABASE_URL prod):
 *   DATABASE_URL="postgresql://app_cirurgiao:***@127.0.0.1:5434/projeto_cirurgiao" \
 *   npx tsx scripts/rollback-tobias.ts --backup <path> --apply --confirm-tobias-rollback
 *
 * Restaura contentPt, chapterPt, isTranslated, isIndexed, embedding.
 * NÃO toca content (EN) nem o Fossum. Nunca imprime conteúdo de livro/segredo.
 */
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import {
  parseBackupJsonl,
  selectBackupForRollback,
  BackupRecord,
} from '../src/modules/ai-library/services/tobias-reembed-planner';

const DEFAULT_MAX_INDEX = 9;

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const backupPath = getArg('--backup');
  const maxIndexRaw = getArg('--max-index');
  const maxIndex = maxIndexRaw && /^\d+$/.test(maxIndexRaw) ? parseInt(maxIndexRaw, 10) : DEFAULT_MAX_INDEX;

  if (!backupPath) {
    console.error('Uso: rollback-tobias.ts --backup <backup.jsonl> [--max-index 9] [--apply --confirm-tobias-rollback]');
    process.exit(1);
  }
  if (!fs.existsSync(backupPath)) {
    console.error('Backup não encontrado no caminho informado.');
    process.exit(1);
  }
  if (apply && !process.argv.includes('--confirm-tobias-rollback')) {
    console.error('--apply BLOQUEADO — falta --confirm-tobias-rollback.');
    process.exit(1);
  }

  const mode = apply ? 'APPLY' : 'DRY-RUN';
  console.log(`=== rollback Tobias [${mode}] (max-index=${maxIndex}) ===`);

  const records = parseBackupJsonl(fs.readFileSync(backupPath, 'utf8'));
  const toRestore = selectBackupForRollback(records, maxIndex);

  console.log(`Backup: ${records.length} registros. A restaurar (chunkIndex 0..${maxIndex}): ${toRestore.length}`);
  console.log('chunkIndex/ids a restaurar:');
  toRestore.forEach((r) => console.log(`  chunkIndex=${r.chunkIndex} id=${r.id}`));

  if (!apply) {
    console.log(`✅ DRY-RUN — restauraria ${toRestore.length} chunks. Nada escrito.`);
    process.exit(0);
  }

  // =========================== APPLY ROLLBACK ===========================
  const prisma = new PrismaClient();
  try {
    let restored = 0;
    for (const r of toRestore as BackupRecord[]) {
      // campos não-vetoriais (NÃO toca content EN)
      await prisma.knowledgeChunk.update({
        where: { id: r.id },
        data: {
          contentPt: r.contentPt,
          chapterPt: r.chapterPt,
          isTranslated: r.isTranslated,
          isIndexed: r.isIndexed,
        },
      });
      // embedding (restaura o vetor original; null → NULL)
      if (r.embedding == null) {
        await prisma.$executeRawUnsafe(
          `UPDATE knowledge_chunks SET embedding = NULL WHERE id = $1`,
          r.id,
        );
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE knowledge_chunks SET embedding = $1::vector WHERE id = $2`,
          r.embedding,
          r.id,
        );
      }
      restored++;
    }
    console.log(`✅ ROLLBACK concluído — ${restored} chunks restaurados (chunkIndex 0..${maxIndex}).`);
    process.exit(0);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Erro:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
