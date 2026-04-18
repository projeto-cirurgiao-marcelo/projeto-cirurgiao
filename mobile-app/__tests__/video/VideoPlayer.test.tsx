/**
 * Smoke test do VideoPlayer.
 *
 * Valida que:
 * 1. Renderiza sem crash com um streamUrl HLS + payload de Video mockado.
 * 2. Monta <VideoView /> mockado (testID='mocked-video-view').
 * 3. Mostra fallback "Video indisponivel" quando streamUrl vazio.
 *
 * Note que VideoView real foi stubbado em jest.setup.ts.
 */
import { render } from '@testing-library/react-native';
import VideoPlayer from '../../src/components/video/VideoPlayer';
import type { Video } from '../../src/types/course.types';

// progressService usado em auto-save: mocka pra nao chamar HTTP real.
jest.mock('../../src/services/api/progress.service', () => ({
  progressService: {
    saveProgress: jest.fn().mockResolvedValue(undefined),
    markAsCompleted: jest.fn().mockResolvedValue(undefined),
  },
}));

const makeVideo = (overrides: Partial<Video> = {}): Video => ({
  id: 'vid_1',
  title: 'Teste',
  description: null,
  cloudflareId: null,
  cloudflareUrl: null,
  thumbnailUrl: null,
  duration: 900,
  order: 1,
  isPublished: true,
  moduleId: 'mod_1',
  uploadStatus: 'READY',
  uploadProgress: 100,
  uploadError: null,
  externalUrl: null,
  hlsUrl: 'https://cdn.example.com/videos/x/playlist.m3u8',
  videoSource: 'r2_hls',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  playback: {
    kind: 'hls',
    playbackUrl: 'https://cdn.example.com/videos/x/playlist.m3u8',
    captionsEmbedded: true,
  },
  ...overrides,
});

describe('<VideoPlayer />', () => {
  it('renderiza VideoView quando streamUrl HLS valido', () => {
    const { getByTestId } = render(
      <VideoPlayer
        video={makeVideo()}
        streamUrl="https://cdn.example.com/videos/x/playlist.m3u8"
      />,
    );
    expect(getByTestId('mocked-video-view')).toBeTruthy();
  });

  it('mostra fallback "Video indisponivel" quando streamUrl vazio', () => {
    const { getByText, queryByTestId } = render(
      <VideoPlayer video={makeVideo()} streamUrl="" />,
    );
    expect(getByText('Vídeo indisponível')).toBeTruthy();
    expect(queryByTestId('mocked-video-view')).toBeNull();
  });
});
