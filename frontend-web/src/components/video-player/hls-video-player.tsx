'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import Hls from 'hls.js';
import { Settings } from 'lucide-react';
import {
  MediaController,
  MediaControlBar,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaMuteButton,
  MediaVolumeRange,
  MediaCaptionsButton,
  MediaPlaybackRateButton,
  MediaPipButton,
  MediaFullscreenButton,
  MediaLoadingIndicator,
} from 'media-chrome/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logger } from '@/lib/logger';

export interface HlsPlayerRef {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
}

interface QualityLevel {
  index: number;
  height: number;
  width: number;
  bitrate: number;
  label: string;
}

interface HlsVideoPlayerProps {
  src: string;
  initialTime?: number;
  /** Dá play sozinho ao carregar (modo autoplay/maratona da watch page) */
  autoPlay?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onReady?: (duration: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  className?: string;
  /**
   * VTT URL explicita — pra flows onde as legendas vem fora do HLS
   * manifest (ex: cloudflare Stream com `captionsEmbedded === false`).
   * Quando presente, pula a derivacao por convencao do R2
   * (`playlist.m3u8` -> `subtitles_pt.vtt`).
   *
   * Pode ser uma URL absoluta ou um path relativo ao mesmo origin.
   * Se exigir Authorization, prefira resolver pra um blob URL antes
   * de passar (fetch via apiClient na page + URL.createObjectURL).
   */
  externalCaptionsUrl?: string;
  externalCaptionsLang?: string; // default 'pt'
  externalCaptionsLabel?: string; // default 'Portugues'
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SEEK_SECONDS = 10;

const HlsVideoPlayer = forwardRef<HlsPlayerRef, HlsVideoPlayerProps>(
  function HlsVideoPlayer(
    {
      src,
      initialTime = 0,
      autoPlay = false,
      onTimeUpdate,
      onReady,
      onEnded,
      onPlay,
      onPause,
      className,
      externalCaptionsUrl,
      externalCaptionsLang = 'pt',
      externalCaptionsLabel = 'Portugues',
    },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const hasRestoredPosition = useRef(false);

    // Callback refs to avoid stale closures
    const onTimeUpdateRef = useRef(onTimeUpdate);
    const onReadyRef = useRef(onReady);
    const onEndedRef = useRef(onEnded);
    const onPlayRef = useRef(onPlay);
    const onPauseRef = useRef(onPause);

    useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; }, [onTimeUpdate]);
    useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
    useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
    useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);
    useEffect(() => { onPauseRef.current = onPause; }, [onPause]);

    // Quality levels state (popover custom — media-chrome nao expoe menu HLS)
    const [qualities, setQualities] = useState<QualityLevel[]>([]);
    const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = auto

    // Expose imperative API
    useImperativeHandle(ref, () => ({
      getCurrentTime: () => videoRef.current?.currentTime ?? 0,
      getDuration: () => videoRef.current?.duration ?? 0,
      seekTo: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      play: () => { videoRef.current?.play(); },
      pause: () => { videoRef.current?.pause(); },
    }), []);

    // Change quality level
    const handleQualityChange = useCallback((levelIndex: number) => {
      if (hlsRef.current) {
        hlsRef.current.currentLevel = levelIndex; // -1 = auto
        setCurrentQuality(levelIndex);
      }
    }, []);

    // Initialize HLS.js
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      // Sempre usar HLS.js quando disponivel (Chrome, Firefox, Edge)
      if (Hls.isSupported()) {
        logger.log('[HlsPlayer] Initializing HLS.js with src:', src);

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          startLevel: -1,
          // ABR ciente de CPU/tela: nao subir alem do tamanho do player e
          // rebaixar nivel quando o decode derruba frames (notebooks fracos
          // travavam em 1080p+ porque a banda permitia mas a CPU nao).
          capLevelToPlayerSize: true,
          capLevelOnFPSDrop: true,
        });
        // Nota: o desligamento da legenda por padrao e feito pelo efeito de
        // force-off mais abaixo (poe as text tracks em `disabled` na janela
        // inicial). `subtitleDisplay` nao e opcao tipada do hls.js nesta versao.

        hls.loadSource(src);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          logger.log('[HlsPlayer] Manifest parsed, levels:', data.levels.length);
          const levels: QualityLevel[] = data.levels.map((level, index) => ({
            index,
            height: level.height,
            width: level.width,
            bitrate: level.bitrate,
            label: level.height >= 2160 ? '4K' : `${level.height}p`,
          }));
          levels.sort((a, b) => a.height - b.height);
          setQualities(levels);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          logger.log('[HlsPlayer] Level switched to:', data.level);
        });

        let recoverAttempts = 0;
        const MAX_RECOVER = 3;

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return; // Ignorar erros nao-fatais silenciosamente

          logger.warn('[HlsPlayer] Fatal error:', data.type, data.details);

          recoverAttempts++;
          if (recoverAttempts > MAX_RECOVER) {
            logger.error('[HlsPlayer] Max recovery attempts reached, stopping.');
            hls.destroy();
            return;
          }

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            // Network/parsing errors: nao tentar retry automatico (causa loop infinito)
            hls.destroy();
          }
        });

        return () => {
          hls.destroy();
          hlsRef.current = null;
        };
      }

      // Fallback: Native HLS (Safari/iOS apenas)
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        logger.log('[HlsPlayer] Using native HLS (Safari)');
        video.src = src;
        return;
      }

      logger.error('[HlsPlayer] HLS not supported in this browser');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    // Video element event listeners
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
        onTimeUpdateRef.current?.(video.currentTime, video.duration || 0);
      };

      const handleLoadedMetadata = () => {
        const duration = video.duration || 0;
        logger.log('[HlsPlayer] loadedmetadata, duration:', duration);
        onReadyRef.current?.(duration);

        if (initialTime > 0 && !hasRestoredPosition.current) {
          hasRestoredPosition.current = true;
          logger.log('[HlsPlayer] Restoring position to:', initialTime);
          video.currentTime = initialTime;
        }
      };

      const handleEnded = () => {
        logger.log('[HlsPlayer] Video ended');
        onEndedRef.current?.();
      };

      const handlePlay = () => { onPlayRef.current?.(); };
      const handlePause = () => { onPauseRef.current?.(); };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('ended', handleEnded);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Legenda OFF por padrao no carregamento. Algo (hls.js / o <track>) liga a
    // faixa ao iniciar mesmo sem `default` e com `subtitleDisplay: false`, entao
    // forcamos `disabled` — mas SO durante a janela inicial (1.5s). Depois disso
    // o aluno liga/desliga livremente pela barra (nao brigamos com a acao dele).
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      let autoOff = true;
      const disableSubs = () => {
        if (!autoOff) return;
        const tracks = video.textTracks;
        for (let i = 0; i < tracks.length; i++) {
          const t = tracks[i];
          if ((t.kind === 'subtitles' || t.kind === 'captions') && t.mode !== 'disabled') {
            t.mode = 'disabled';
          }
        }
      };

      const onChange = () => disableSubs();
      const onAdd = () => disableSubs();
      video.textTracks.addEventListener?.('change', onChange);
      video.textTracks.addEventListener?.('addtrack', onAdd);
      const timers = [0, 200, 600, 1200].map((ms) => setTimeout(disableSubs, ms));
      const endWindow = setTimeout(() => { autoOff = false; }, 1500);

      return () => {
        video.textTracks.removeEventListener?.('change', onChange);
        video.textTracks.removeEventListener?.('addtrack', onAdd);
        timers.forEach(clearTimeout);
        clearTimeout(endWindow);
      };
    }, [src]);

    const currentQualityLabel = currentQuality === -1
      ? 'Auto'
      : qualities.find(q => q.index === currentQuality)?.label ?? 'Auto';

    // Resolve VTT URL:
    //   1) Se `externalCaptionsUrl` for passado pelo caller (contrato
    //      playback.captionsUrl no flow cloudflare), usa direto.
    //   2) Senao, deriva do m3u8 por convencao R2
    //      (playlist.m3u8 -> subtitles_pt.vtt) e faz HEAD pra confirmar.
    const derivedSubtitleUrl = src.replace(/playlist\.m3u8$/, 'subtitles_pt.vtt');
    const subtitleUrl = externalCaptionsUrl ?? derivedSubtitleUrl;

    const [hasSubtitles, setHasSubtitles] = useState(false);
    useEffect(() => {
      if (externalCaptionsUrl) {
        // Caller garantiu que o VTT existe — nao fazemos HEAD (pode
        // ser blob URL ou endpoint auth-protected onde HEAD seria
        // inconsistente).
        setHasSubtitles(true);
        return;
      }
      fetch(derivedSubtitleUrl, { method: 'HEAD' })
        .then(res => {
          if (res.ok) {
            setHasSubtitles(true);
            logger.log('[HlsPlayer] Subtitles found:', derivedSubtitleUrl);
          }
        })
        .catch(() => { /* VTT nao existe, ok */ });
    }, [derivedSubtitleUrl, externalCaptionsUrl]);

    return (
      <MediaController
        className={`relative w-full h-full bg-black ${className ?? ''}`}
      >
        <video
          slot="media"
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          autoPlay={autoPlay}
          crossOrigin="anonymous"
        >
          {hasSubtitles && (
            <track
              kind="subtitles"
              src={subtitleUrl}
              srcLang={externalCaptionsLang}
              label={externalCaptionsLabel}
            />
          )}
        </video>

        <MediaLoadingIndicator
          slot="centered-chrome"
          noAutohide
        />

        {/* Top-right chrome: custom HLS quality menu (media-chrome nao tem) */}
        {qualities.length > 1 && (
          <div
            slot="top-chrome"
            className="flex w-full items-start justify-end p-2"
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="media-control-btn flex items-center gap-1 px-2 py-1 text-xs font-semibold cursor-pointer select-none"
                  title="Qualidade do vídeo"
                >
                  <Settings className="h-3.5 w-3.5" aria-hidden />
                  <span>{currentQualityLabel === 'Auto' ? 'Qualidade' : currentQualityLabel}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="media-menu-surface min-w-[120px] border-0 bg-transparent p-0 shadow-none"
              >
                <DropdownMenuItem
                  onSelect={() => handleQualityChange(-1)}
                  data-selected={currentQuality === -1}
                  className="media-menu-item cursor-pointer px-3 py-1.5 text-xs focus:bg-transparent"
                >
                  Auto
                </DropdownMenuItem>
                {qualities.map((q) => (
                  <DropdownMenuItem
                    key={q.index}
                    onSelect={() => handleQualityChange(q.index)}
                    data-selected={currentQuality === q.index}
                    className="media-menu-item cursor-pointer px-3 py-1.5 text-xs focus:bg-transparent"
                  >
                    {q.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <MediaControlBar>
          <MediaPlayButton />
          <MediaSeekBackwardButton seekOffset={SEEK_SECONDS} />
          <MediaSeekForwardButton seekOffset={SEEK_SECONDS} />
          <MediaTimeDisplay showDuration />
          <MediaTimeRange />
          <MediaPlaybackRateButton rates={PLAYBACK_RATES} />
          <MediaMuteButton />
          <MediaVolumeRange />
          {hasSubtitles && <MediaCaptionsButton />}
          <MediaPipButton />
          <MediaFullscreenButton />
        </MediaControlBar>
      </MediaController>
    );
  }
);

export default HlsVideoPlayer;
