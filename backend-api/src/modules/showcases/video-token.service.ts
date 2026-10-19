import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

/** 12 h: uma aula aberta mais que isso recarrega a URL (o player trata o 403). */
const DEFAULT_TTL_SECONDS = 12 * 60 * 60;

/**
 * Token de playback (anti-compartilhamento, item 1 do plano de 19/10/2026).
 * O Worker `cloudflare-workers/video-gate` na rota `cdn…/videos/*` só serve
 * com `?t=` válido. Formato: `base64url(json).base64url(hmac-sha256)`, payload
 * `{ u: userId, p: diretório do vídeo, e: expiração unix }`. O segredo
 * VIDEO_TOKEN_SECRET é o mesmo nos dois lados. Sem segredo ou host
 * configurado o serviço devolve a URL intacta (ambiente local).
 */
@Injectable()
export class VideoTokenService {
  private readonly logger = new Logger(VideoTokenService.name);
  private readonly secret: string | null;
  private readonly cdnHost: string | null;

  constructor(config: ConfigService) {
    this.secret = config.get<string>('VIDEO_TOKEN_SECRET') || null;
    this.cdnHost = config.get<string>('VIDEO_CDN_HOST') || null;
    if (!this.secret || !this.cdnHost) {
      this.logger.warn('VIDEO_TOKEN_SECRET/VIDEO_CDN_HOST ausentes: URLs de vídeo saem sem assinatura');
    }
  }

  sign(userId: string, dirPath: string, ttlSeconds = DEFAULT_TTL_SECONDS): string {
    if (!this.secret) throw new Error('VIDEO_TOKEN_SECRET não configurado');
    const payload = Buffer.from(
      JSON.stringify({ u: userId, p: dirPath, e: Math.floor(Date.now() / 1000) + ttlSeconds }),
    ).toString('base64url');
    const sig = createHmac('sha256', this.secret).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  /** Anexa `?t=` quando a URL é do CDN de vídeo; qualquer outra volta como veio. */
  withToken(url: string | null | undefined, userId: string): string | null {
    if (!url) return null;
    if (!this.secret || !this.cdnHost) return url;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return url;
    }
    if (parsed.host !== this.cdnHost) return url;
    const dir = parsed.pathname.slice(0, parsed.pathname.lastIndexOf('/') + 1);
    parsed.searchParams.set('t', this.sign(userId, dir));
    return parsed.toString();
  }
}
