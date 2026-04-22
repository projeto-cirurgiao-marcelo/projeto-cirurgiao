/**
 * Backfill script — re-embeds every existing transcript chunk using the
 * real Vertex text-embedding-004 endpoint.
 *
 * DO NOT RUN YET. The pgvector migration (task 4) still has to land so
 * chunks get a persisted `vector(768)` column. Until then this script will
 * regenerate embeddings that are not stored anywhere meaningful — it only
 * exists so the command is ready to ship on day zero of pgvector.
 *
 * Usage (after pgvector migration is deployed):
 *   cd backend-api
 *   # make sure DATABASE_URL points at the Cloud SQL proxy or local DB
 *   npx ts-node scripts/backfill-embeddings.ts --batch 20
 *
 * Flags:
 *   --batch N      Chunks per DB page (default 100). Vertex still caps each
 *                  predict call at 5 via VertexEmbeddingsService.
 *   --dry-run      Log what would happen without hitting Vertex or DB.
 *   --limit N      Stop after N chunks (handy for smoke tests).
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { VertexEmbeddingsService } from '../src/modules/ai-chat/services/vertex-embeddings.service';
import { loadSecretsIntoEnv } from '../src/config/secrets';

interface CliOptions {
  batch: number;
  dryRun: boolean;
  limit: number | null;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { batch: 100, dryRun: false, limit: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--batch') opts.batch = parseInt(argv[++i] ?? '100', 10);
    else if (arg === '--limit') opts.limit = parseInt(argv[++i] ?? '0', 10) || null;
  }
  return opts;
}

async function main() {
  const logger = new Logger('BackfillEmbeddings');
  const opts = parseArgs(process.argv.slice(2));
  logger.log(`Starting with opts ${JSON.stringify(opts)}`);

  await loadSecretsIntoEnv({
    log: (msg) => logger.log(msg),
    logError: (msg, err) => logger.error(msg, err as any),
  });

  // We only need the DI container for PrismaService + VertexEmbeddingsService;
  // create the Nest app with logging off so this runs clean in CI output.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  const prisma = app.get(PrismaService);
  const embeddings = app.get(VertexEmbeddingsService);

  let processed = 0;
  let reindexed = 0;
  let errors = 0;

  try {
    // Pull ALL chunks (indexed or not) because we want to refresh the
    // embedding with the real model, not just fill in the blanks.
    while (true) {
      const chunks = await prisma.transcriptEmbedding.findMany({
        orderBy: { id: 'asc' },
        skip: processed,
        take: opts.batch,
      });
      if (chunks.length === 0) break;

      logger.log(
        `Page ${Math.floor(processed / opts.batch) + 1}: ${chunks.length} chunks`,
      );

      if (!opts.dryRun) {
        try {
          const vectors = await embeddings.generateEmbeddings(
            chunks.map((c) => c.chunkText),
          );
          for (let i = 0; i < chunks.length; i++) {
            const c = chunks[i];
            const vec = vectors[i];
            if (!Array.isArray(vec) || vec.length === 0) {
              errors += 1;
              continue;
            }
            // TODO(pgvector): once the vector column is in, write `vec`
            //                 into `embedding` here via $executeRaw.
            await prisma.transcriptEmbedding.update({
              where: { id: c.id },
              data: {
                isIndexed: true,
                embeddingId: `vertex:text-embedding-004:${c.id}`,
              },
            });
            reindexed += 1;
          }
        } catch (err) {
          logger.error(`Page failed: ${(err as Error).message}`);
          errors += chunks.length;
        }
      }

      processed += chunks.length;
      if (opts.limit && processed >= opts.limit) {
        logger.log(`--limit ${opts.limit} hit; stopping`);
        break;
      }
    }

    logger.log(
      `Done — processed=${processed} reindexed=${reindexed} errors=${errors}`,
    );
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
