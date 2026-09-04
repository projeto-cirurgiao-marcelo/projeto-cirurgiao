/**
 * Testes do VideoPlayer.
 *
 * Smoke:
 * 1. Renderiza sem crash com um streamUrl HLS + payload de Video mockado.
 * 2. Monta <VideoView /> mockado (testID='mocked-video-view').
 * 3. Mostra fallback "Video indisponivel" quando streamUrl vazio.
 *
 * Preview (corte nível 1): o polling de 500ms clampa currentTime em
 * previewSeconds, pausa e mostra o overlay "Prévia encerrada"; o CTA
 * "Saiba mais" só aparece com onOfferPress e chama o handler
 * (Central de Ajuda) — o app não abre o checkout direto.
 *
 * Note que VideoView real foi stubbado em jest.setup.ts.
 */
import { render, act, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { useVideoPlayer } from 'expo-video';
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

describe('<VideoPlayer /> — preview (corte nível 1)', () => {
  const STREAM = 'https://cdn.example.com/videos/x/playlist.m3u8';

  // Player fake com tempo controlável — o polling de 500ms lê currentTime.
  const makeFakePlayer = (currentTime: number) => ({
    play: jest.fn(),
    pause: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    currentTime,
    duration: 900,
    playing: true,
    playbackRate: 1,
    subtitleTrack: null,
    loop: false,
  });

  let fakePlayer: ReturnType<typeof makeFakePlayer>;

  beforeEach(() => {
    jest.useFakeTimers();
    fakePlayer = makeFakePlayer(0);
    (useVideoPlayer as jest.Mock).mockImplementation(() => fakePlayer);
  });

  afterEach(() => {
    jest.useRealTimers();
    // Restaura o stub default do jest.setup.ts (player novo por chamada).
    (useVideoPlayer as jest.Mock).mockImplementation(() => makeFakePlayer(0));
  });

  const renderPreview = (props: { onOfferPress?: () => void } = {}) =>
    render(
      <VideoPlayer
        video={makeVideo()}
        streamUrl={STREAM}
        previewSeconds={120}
        offerTitle="Castração Descomplicada"
        {...props}
      />,
    );

  const advancePastCut = () => {
    fakePlayer.currentTime = 130; // além do limite de 120s
    act(() => {
      jest.advanceTimersByTime(500);
    });
  };

  it('clampa o tempo, pausa e mostra o overlay ao cruzar previewSeconds', () => {
    const { getByText } = renderPreview();
    advancePastCut();

    expect(fakePlayer.pause).toHaveBeenCalled();
    expect(fakePlayer.currentTime).toBe(120);
    expect(getByText('Prévia encerrada')).toBeTruthy();
    expect(
      getByText(
        'Esta aula faz parte de "Castração Descomplicada" e não está disponível na sua conta.',
      ),
    ).toBeTruthy();
  });

  it('não mostra overlay antes do limite do preview', () => {
    const { queryByText } = renderPreview();
    fakePlayer.currentTime = 60;
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(queryByText('Prévia encerrada')).toBeNull();
  });

  it('mostra CTA "Saiba mais" quando há onOfferPress', () => {
    const { getByText } = renderPreview({ onOfferPress: jest.fn() });
    advancePastCut();
    expect(getByText('Saiba mais')).toBeTruthy();
  });

  it('omite o CTA sem onOfferPress (produto ainda não vendável)', () => {
    const { getByText, queryByText } = renderPreview();
    advancePastCut();
    expect(getByText('Prévia encerrada')).toBeTruthy();
    expect(queryByText('Saiba mais')).toBeNull();
  });

  it('CTA chama onOfferPress (Central de Ajuda) — nunca abre o checkout direto', async () => {
    const onOfferPress = jest.fn();
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);

    const { getByText } = renderPreview({ onOfferPress });
    advancePastCut();

    await act(async () => {
      fireEvent.press(getByText('Saiba mais'));
    });

    expect(onOfferPress).toHaveBeenCalledTimes(1);
    expect(openUrl).not.toHaveBeenCalled();

    openUrl.mockRestore();
  });
});
