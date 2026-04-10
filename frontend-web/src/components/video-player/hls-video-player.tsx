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
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onReady?: (duration: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  className?: string;
}

const HlsVideoPlayer = forwardRef<HlsPlayerRef, HlsVideoPlayerProps>(
  function HlsVideoPlayer(
    { src, initialTime = 0, onTimeUpdate, onReady, onEnded, onPlay, onPause, className },
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

    // Quality levels state
    const [qualities, setQualities] = useState<QualityLevel[]>([]);
    const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = auto
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showRateMenu, setShowRateMenu] = useState(false);
    const [subtitlesOn, setSubtitlesOn] = useState(true); // CC ligado por default

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
      setShowQualityMenu(false);
    }, []);

    // Change playback rate
    const handleRateChange = useCallback((rate: number) => {
      if (videoRef.current) {
        videoRef.current.playbackRate = rate;
        setPlaybackRate(rate);
      }
      setShowRateMenu(false);
    }, []);

    // Toggle subtitles
    const handleToggleSubtitles = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      const track = video.textTracks[0];
      if (track) {
        const newState = track.mode === 'showing' ? 'hidden' : 'showing';
        track.mode = newState;
        setSubtitlesOn(newState === 'showing');
      }
    }, []);

    // Initialize HLS.js
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      // Sempre usar HLS.js quando disponivel (Chrome, Firefox, Edge)
      if (Hls.isSupported()) {
        console.log('[HlsPlayer] Initializing HLS.js with src:', src);

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          startLevel: -1,
        });

        hls.loadSource(src);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          console.log('[HlsPlayer] Manifest parsed, levels:', data.levels.length);
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
          console.log('[HlsPlayer] Level switched to:', data.level);
        });

        let recoverAttempts = 0;
        const MAX_RECOVER = 3;

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return; // Ignorar erros nao-fatais silenciosamente

          console.warn('[HlsPlayer] Fatal error:', data.type, data.details);

          recoverAttempts++;
          if (recoverAttempts > MAX_RECOVER) {
            console.error('[HlsPlayer] Max recovery attempts reached, stopping.');
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
        console.log('[HlsPlayer] Using native HLS (Safari)');
        video.src = src;
        return;
      }

      console.error('[HlsPlayer] HLS not supported in this browser');
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
        console.log('[HlsPlayer] loadedmetadata, duration:', duration);
        onReadyRef.current?.(duration);

        if (initialTime > 0 && !hasRestoredPosition.current) {
          hasRestoredPosition.current = true;
          console.log('[HlsPlayer] Restoring position to:', initialTime);
          video.currentTime = initialTime;
        }
      };

      const handleEnded = () => {
        console.log('[HlsPlayer] Video ended');
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

    // Close menus when clicking outside (use mousedown to avoid React synthetic event conflict)
    const controlsRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (controlsRef.current && !controlsRef.current.contains(e.target as Node)) {
          setShowQualityMenu(false);
          setShowRateMenu(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentQualityLabel = currentQuality === -1
      ? 'Auto'
      : qualities.find(q => q.index === currentQuality)?.label ?? 'Auto';

    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];

    // Derivar URL do VTT a partir do m3u8 (mesmo diretorio no R2)
    const subtitleUrl = src.replace(/playlist\.m3u8$/, 'subtitles_pt.vtt');

    // Verificar se o VTT existe (HEAD request uma vez)
    const [hasSubtitles, setHasSubtitles] = useState(false);
    useEffect(() => {
      fetch(subtitleUrl, { method: 'HEAD' })
        .then(res => {
          if (res.ok) {
            setHasSubtitles(true);
            console.log('[HlsPlayer] Subtitles found:', subtitleUrl);
          }
        })
        .catch(() => { /* VTT nao existe, ok */ });
    }, [subtitleUrl]);

    return (
      <div className={`relative w-full h-full bg-black ${className ?? ''}`}>
        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          playsInline
          crossOrigin="anonymous"
        >
          {hasSubtitles && (
            <track
              kind="subtitles"
              src={subtitleUrl}
              srcLang="pt"
              label="Portugues"
              default
            />
          )}
        </video>

        {/* Custom controls overlay - Quality & Speed */}
        <div
          ref={controlsRef}
          className="absolute bottom-14 right-2 flex items-center gap-1"
          style={{ zIndex: 2147483647 }}
        >
          {/* CC Toggle */}
          {hasSubtitles && (
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
                handleToggleSubtitles();
              }}
              className={`px-2 py-1 text-xs font-semibold rounded cursor-pointer select-none ${
                subtitlesOn
                  ? 'text-black bg-white hover:bg-white/90'
                  : 'text-white bg-black/70 hover:bg-black/90'
              }`}
              title={subtitlesOn ? 'Desativar legendas' : 'Ativar legendas'}
            >
              CC
            </button>
          )}

          {/* Playback Rate Selector */}
          <div className="relative">
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
                setShowRateMenu(prev => !prev);
                setShowQualityMenu(false);
              }}
              className="px-2 py-1 text-xs font-semibold text-white bg-black/70 hover:bg-black/90 rounded cursor-pointer select-none"
              title="Velocidade"
            >
              {playbackRate}x
            </button>
            {showRateMenu && (
              <div className="absolute bottom-full right-0 mb-1 bg-black/90 rounded-lg overflow-hidden shadow-lg min-w-[80px]">
                {rates.map((rate) => (
                  <button
                    key={rate}
                    onMouseDown={(e) => { e.stopPropagation(); handleRateChange(rate); }}
                    className={`block w-full text-left px-3 py-1.5 text-xs text-white hover:bg-white/20 cursor-pointer ${
                      playbackRate === rate ? 'bg-white/30 font-bold' : ''
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quality Selector */}
          {qualities.length > 1 && (
            <div className="relative">
              <button
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setShowQualityMenu(prev => !prev);
                  setShowRateMenu(false);
                }}
                className="px-2 py-1 text-xs font-semibold text-white bg-black/70 hover:bg-black/90 rounded cursor-pointer select-none"
                title="Qualidade"
              >
                {currentQualityLabel}
              </button>
              {showQualityMenu && (
                <div className="absolute bottom-full right-0 mb-1 bg-black/90 rounded-lg overflow-hidden shadow-lg min-w-[100px]">
                  <button
                    onMouseDown={(e) => { e.stopPropagation(); handleQualityChange(-1); }}
                    className={`block w-full text-left px-3 py-1.5 text-xs text-white hover:bg-white/20 cursor-pointer ${
                      currentQuality === -1 ? 'bg-white/30 font-bold' : ''
                    }`}
                  >
                    Auto
                  </button>
                  {qualities.map((q) => (
                    <button
                      key={q.index}
                      onMouseDown={(e) => { e.stopPropagation(); handleQualityChange(q.index); }}
                      className={`block w-full text-left px-3 py-1.5 text-xs text-white hover:bg-white/20 cursor-pointer ${
                        currentQuality === q.index ? 'bg-white/30 font-bold' : ''
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default HlsVideoPlayer;
