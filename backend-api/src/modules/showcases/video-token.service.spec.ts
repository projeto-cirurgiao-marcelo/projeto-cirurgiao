import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

import { VideoTokenService } from './video-token.service';

const config = (env: Record<string, string>) =>
  ({ get: (k: string) => env[k] }) as unknown as ConfigService;

describe('VideoTokenService', () => {
  const secret = 'segredo-de-teste';
  const service = new VideoTokenService(
    config({ VIDEO_TOKEN_SECRET: secret, VIDEO_CDN_HOST: 'cdn.projetocirurgiao.app' }),
  );
  const url = 'https://cdn.projetocirurgiao.app/videos/Treinamentos%20Premium/Aula%201/playlist.m3u8';

  it('assina a URL do CDN com payload (u, p, e) e HMAC válido', () => {
    const signed = new URL(service.withToken(url, 'user-1')!);
    const t = signed.searchParams.get('t')!;
    const [payload, sig] = t.split('.');
    expect(createHmac('sha256', secret).update(payload).digest('base64url')).toBe(sig);
    const body = JSON.parse(Buffer.from(payload, 'base64url').toString());
    expect(body.u).toBe('user-1');
    expect(body.p).toBe('/videos/Treinamentos%20Premium/Aula%201/');
    expect(body.e).toBeGreaterThan(Date.now() / 1000 + 11 * 3600);
    expect(signed.pathname).toBe('/videos/Treinamentos%20Premium/Aula%201/playlist.m3u8');
  });

  it('deixa intacta URL de outro host (Cloudflare Stream, YouTube) e null', () => {
    const other = 'https://customer-x.cloudflarestream.com/abc/manifest/video.m3u8';
    expect(service.withToken(other, 'u')).toBe(other);
    expect(service.withToken(null, 'u')).toBeNull();
    expect(service.withToken('nao-e-url', 'u')).toBe('nao-e-url');
  });

  it('sem segredo/host configurado devolve a URL como veio', () => {
    const plain = new VideoTokenService(config({}));
    expect(plain.withToken(url, 'u')).toBe(url);
  });
});
