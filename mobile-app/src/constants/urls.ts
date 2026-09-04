/**
 * URLs do web app usadas pelo mobile. `EXPO_PUBLIC_WEB_URL` permite apontar
 * pra outro ambiente no build (eas.json); o padrão é o domínio canônico.
 */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'https://app.projetocirurgiao.app').replace(
  /\/$/,
  '',
);

/**
 * Central de ajuda pública. Com `showcaseSlug`, abre já na pergunta
 * "Como desbloquear mais cursos?" com o link daquela vitrine — é a página
 * web que aponta pro checkout, nunca o app (padrão Spotify / App Store 3.1.1).
 * `embed=1` esconde cabeçalho/rodapé do site dentro do WebView.
 */
export function helpUrl(showcaseSlug?: string): string {
  const params = new URLSearchParams({ embed: '1' });
  if (showcaseSlug) params.set('desbloquear', showcaseSlug);
  return `${WEB_URL}/ajuda?${params.toString()}`;
}

/** Domínios que devem sair do WebView pro navegador do sistema (checkout). */
export function isExternalCheckoutUrl(url: string): boolean {
  try {
    const host = new URL(url).host;
    const webHost = new URL(WEB_URL).host;
    return host !== webHost;
  } catch {
    return false;
  }
}
