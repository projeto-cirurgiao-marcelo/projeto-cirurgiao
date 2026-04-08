/**
 * Script para atualizar hlsUrl de videos existentes que ja tem arquivos m3u8 no R2.
 *
 * Uso:
 *   npx ts-node scripts/set-hls-urls.ts
 *
 * O script lista os videos do banco, e para cada um que tem cloudflareId mas nao tem hlsUrl,
 * verifica se existe um arquivo m3u8 correspondente no R2 e atualiza o registro.
 *
 * ANTES DE RODAR: Edite o mapeamento VIDEO_HLS_MAP abaixo com os nomes das pastas no R2.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CDN_BASE = 'https://cdn.projetocirurgiao.app/videos';

/**
 * Mapeamento: Video ID -> nome da pasta no R2
 * Preencha com os IDs dos videos e os nomes das pastas correspondentes.
 *
 * Exemplo:
 *   'uuid-do-video': 'Biopsia ossea tibia distal_2160p',
 *
 * Para descobrir os nomes das pastas, liste o bucket R2:
 *   rclone ls r2:s3-projeto-cirurgiao/videos/ --max-depth 1
 */
const VIDEO_HLS_MAP: Record<string, string> = {
  // Preencha aqui:
  // 'video-id-1': 'Nome da pasta no R2',
  // 'video-id-2': 'Outra pasta no R2',
};

async function main() {
  console.log('=== Atualizando hlsUrl dos videos ===\n');

  const entries = Object.entries(VIDEO_HLS_MAP);
  if (entries.length === 0) {
    console.log('Nenhum mapeamento definido em VIDEO_HLS_MAP.');
    console.log('Edite o script e adicione os IDs dos videos e nomes das pastas no R2.');

    // Listar videos sem hlsUrl para ajudar no mapeamento
    const videos = await prisma.video.findMany({
      where: { hlsUrl: null, isPublished: true },
      select: { id: true, title: true, cloudflareId: true },
      orderBy: { title: 'asc' },
    });

    console.log(`\nVideos publicados sem hlsUrl (${videos.length}):\n`);
    for (const v of videos) {
      console.log(`  '${v.id}': '${v.title}',`);
    }
    return;
  }

  let updated = 0;
  let errors = 0;

  for (const [videoId, folderName] of entries) {
    const hlsUrl = `${CDN_BASE}/${encodeURIComponent(folderName)}/playlist.m3u8`;

    try {
      await prisma.video.update({
        where: { id: videoId },
        data: {
          hlsUrl,
          videoSource: 'r2_hls',
          uploadStatus: 'READY',
        },
      });
      console.log(`  OK: ${videoId} -> ${hlsUrl}`);
      updated++;
    } catch (err: any) {
      console.error(`  ERRO: ${videoId} -> ${err.message}`);
      errors++;
    }
  }

  console.log(`\nResultado: ${updated} atualizados, ${errors} erros`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
