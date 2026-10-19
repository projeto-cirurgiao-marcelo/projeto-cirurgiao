import { describe, expect, it } from 'vitest';
import { signPlaylist, signToken, verifyToken } from '../src/token';

const secret = 'segredo';
const dir = '/videos/Curso/Aula%201/';

describe('verifyToken', () => {
  it('aceita token válido no diretório assinado', async () => {
    const t = await signToken(secret, { u: 'u1', p: dir, e: Math.floor(Date.now() / 1000) + 60 });
    const r = await verifyToken(secret, t, `${dir}playlist.m3u8`);
    expect(r.ok).toBe(true);
  });

  it('rejeita ausente, assinatura errada, expirado e caminho de outro vídeo', async () => {
    const e = Math.floor(Date.now() / 1000) + 60;
    const t = await signToken(secret, { u: 'u1', p: dir, e });
    expect((await verifyToken(secret, null, dir)).ok).toBe(false);
    expect(await verifyToken('outro', t, `${dir}a.ts`)).toMatchObject({ ok: false, reason: 'bad-signature' });
    const old = await signToken(secret, { u: 'u1', p: dir, e: e - 120 });
    expect(await verifyToken(secret, old, `${dir}a.ts`)).toMatchObject({ ok: false, reason: 'expired' });
    expect(await verifyToken(secret, t, '/videos/Outro/Aula/a.ts')).toMatchObject({ ok: false, reason: 'wrong-path' });
    expect(await verifyToken(secret, 'lixo', dir)).toMatchObject({ ok: false, reason: 'malformed' });
  });

  it('bate com o formato do backend (node crypto)', async () => {
    const { createHmac } = await import('node:crypto');
    const body = Buffer.from(JSON.stringify({ u: 'u1', p: dir, e: 4102444800 })).toString('base64url');
    const sig = createHmac('sha256', secret).update(body).digest('base64url');
    expect((await verifyToken(secret, `${body}.${sig}`, `${dir}x.ts`)).ok).toBe(true);
  });
});

describe('signPlaylist', () => {
  it('anexa o token em variantes, segmentos e URI de legenda; ignora comentários e URLs absolutas', () => {
    const playlist = [
      '#EXTM3U',
      '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="pt",URI="subtitles.m3u8"',
      '#EXT-X-STREAM-INF:BANDWIDTH=1000,RESOLUTION=640x360',
      '360p.m3u8',
      '#EXTINF:6.0,',
      '360p_000.ts',
      'https://outro.host/abs.ts',
      '',
    ].join('\n');
    const out = signPlaylist(playlist, 'a.b');
    expect(out).toContain('URI="subtitles.m3u8?t=a.b"');
    expect(out).toContain('\n360p.m3u8?t=a.b\n');
    expect(out).toContain('\n360p_000.ts?t=a.b\n');
    expect(out).toContain('\nhttps://outro.host/abs.ts\n');
    expect(out).toContain('#EXT-X-STREAM-INF:BANDWIDTH=1000,RESOLUTION=640x360\n');
  });
});
