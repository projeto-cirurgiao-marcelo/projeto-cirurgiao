/**
 * Helper compartilhado: deriva o `r2Basename` (segmento da pasta-pai do
 * master playlist) a partir de uma URL HLS no formato canonico do
 * pipeline externo:
 *
 *   https://cdn.projetocirurgiao.app/videos/<basename>/playlist.m3u8
 *
 * Retorna null se a URL nao bater no padrao (ex: video YouTube/Vimeo,
 * URL malformada, sem `.m3u8`).
 */
export function deriveR2Basename(
  hlsUrl: string | null | undefined,
): string | null {
  if (!hlsUrl) return null;
  try {
    const url = new URL(hlsUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const last = parts[parts.length - 1];
    if (!last.toLowerCase().endsWith('.m3u8')) return null;
    return decodeURIComponent(parts[parts.length - 2]);
  } catch {
    return null;
  }
}
