/**
 * Smoke test de videosService apos a migracao pro contrato unificado
 * (commit c49b382).
 *
 * Valida que:
 * 1. getById chama o endpoint correto e devolve o payload literal (incluindo
 *    o campo novo `playback`).
 * 2. Nao existe mais `getStreamData` no service (prevencao de regressao —
 *    o consumidor nao deve tentar chamar essa funcao que foi removida).
 */
import { videosService } from '../../src/services/api/videos.service';

// Mocka o apiClient pra nao bater em HTTP real.
jest.mock('../../src/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

// Import do mock depois do jest.mock pra ter controle tipado.
import { apiClient } from '../../src/services/api/client';
const mockedGet = apiClient.get as jest.Mock;

describe('videosService', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('getById retorna payload com campo playback', async () => {
    const fakeVideo = {
      id: 'vid_1',
      title: 'Colectomia em felinos',
      moduleId: 'mod_1',
      videoSource: 'r2_hls',
      hlsUrl: 'https://cdn.example.com/videos/x/playlist.m3u8',
      cloudflareId: null,
      cloudflareUrl: null,
      externalUrl: null,
      playback: {
        kind: 'hls',
        playbackUrl: 'https://cdn.example.com/videos/x/playlist.m3u8',
        captionsEmbedded: true,
      },
    };
    mockedGet.mockResolvedValue({ data: fakeVideo });

    const result = await videosService.getById('vid_1');

    expect(mockedGet).toHaveBeenCalledWith('/videos/vid_1');
    expect(result.playback?.kind).toBe('hls');
    expect(result.playback?.playbackUrl).toBe(
      'https://cdn.example.com/videos/x/playlist.m3u8',
    );
    expect(result.playback?.captionsEmbedded).toBe(true);
  });

  it('getById propaga payload youtube com kind=iframe', async () => {
    const fakeVideo = {
      id: 'vid_2',
      title: 'Intro YouTube',
      moduleId: 'mod_1',
      videoSource: 'youtube',
      externalUrl: 'https://youtube.com/watch?v=abc',
      hlsUrl: null,
      cloudflareId: null,
      cloudflareUrl: null,
      playback: {
        kind: 'iframe',
        playbackUrl: 'https://youtube.com/watch?v=abc',
      },
    };
    mockedGet.mockResolvedValue({ data: fakeVideo });

    const result = await videosService.getById('vid_2');

    expect(result.playback?.kind).toBe('iframe');
    // captionsEmbedded deve ser undefined em iframe (invariante do contrato).
    expect(result.playback?.captionsEmbedded).toBeUndefined();
  });

  it('getById propaga payload pending com kind=none + playbackUrl null', async () => {
    const fakeVideo = {
      id: 'vid_3',
      title: 'Em processamento',
      moduleId: 'mod_1',
      videoSource: 'cloudflare',
      cloudflareUrl: null,
      cloudflareId: null,
      hlsUrl: null,
      externalUrl: null,
      playback: {
        kind: 'none',
        playbackUrl: null,
      },
    };
    mockedGet.mockResolvedValue({ data: fakeVideo });

    const result = await videosService.getById('vid_3');

    expect(result.playback?.kind).toBe('none');
    expect(result.playback?.playbackUrl).toBeNull();
  });

  it('nao expoe mais getStreamData (removido em c49b382)', () => {
    expect(
      (videosService as Record<string, unknown>).getStreamData,
    ).toBeUndefined();
  });
});
