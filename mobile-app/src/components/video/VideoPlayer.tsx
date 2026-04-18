import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState, useMemo } from 'react';
import {
  StyleSheet, View, Text, AppState, AppStateStatus, TouchableOpacity,
  Pressable, Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import { Video } from '../../types/course.types';
import { progressService } from '../../services/api/progress.service';
import { logger } from '../../lib/logger';

interface VideoPlayerProps {
  video: Video;
  streamUrl: string;
  onEnded?: () => void;
  onProgressUpdate?: (currentTime: number, duration: number) => void;
  autoPlay?: boolean;
  initialPosition?: number;
}

export interface VideoPlayerRef {
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
}

const SAVE_INTERVAL_MS = 10000;
const MIN_PROGRESS_DIFF = 3;
const COMPLETION_THRESHOLD = 0.95;
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface SubtitleTrackInfo {
  id?: string;
  language: string;
  label: string;
}

function formatTime(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(function VideoPlayer(
  { video, streamUrl, onEnded, onProgressUpdate, autoPlay = false, initialPosition = 0 },
  ref
) {
  const videoViewRef = useRef<VideoView>(null);
  const lastSavedTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRestoredPosition = useRef<boolean>(false);
  const hasMarkedCompleted = useRef<boolean>(false);
  const startedBelowThreshold = useRef<boolean>(false);
  const isFullscreenRef = useRef<boolean>(false);
  const isSeeking = useRef<boolean>(false);

  // Controles customizados
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrackInfo[]>([]);
  const [ccEnabled, setCcEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [displayTime, setDisplayTime] = useState(0);
  const [displayDuration, setDisplayDuration] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Source com contentType explícito para HLS
  const videoSource = useMemo(() => {
    if (streamUrl?.includes('.m3u8')) {
      return { uri: streamUrl, contentType: 'hls' as const };
    }
    return streamUrl;
  }, [streamUrl]);

  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
    if (autoPlay) {
      player.play();
    }
  });

  // Detectar se posição inicial está abaixo do threshold
  useEffect(() => {
    if (!player) return;
    // @ts-ignore
    const sub = player.addListener('sourceLoad', (event: any) => {
      const dur = event?.duration || 0;
      if (dur > 0) {
        const pos = initialPosition || 0;
        startedBelowThreshold.current = pos < dur * COMPLETION_THRESHOLD;
      }
    });
    return () => sub.remove();
  }, [player, initialPosition]);

  // Detectar tracks disponíveis via sourceLoad
  useEffect(() => {
    if (!player) return;
    // @ts-ignore
    const subscription = player.addListener('sourceLoad', (event: any) => {
      const subs = event?.availableSubtitleTracks;
      if (subs && subs.length > 0) {
        setSubtitleTracks(subs);
        const ptTrack = subs.find((t: SubtitleTrackInfo) =>
          t.language === 'pt' || t.language === 'por' ||
          t.label?.toLowerCase().includes('portugu')
        );
        if (ptTrack) {
          // @ts-ignore
          player.subtitleTrack = ptTrack;
          setCcEnabled(true);
        }
      }
    });
    return () => subscription.remove();
  }, [player]);

  // Sincronizar estado de playing
  useEffect(() => {
    if (!player) return;
    // @ts-ignore
    const subscription = player.addListener('playingChange', (event: any) => {
      setIsPlaying(event?.isPlaying ?? false);
    });
    return () => subscription.remove();
  }, [player]);

  // Play/Pause handler
  const handlePlayPause = useCallback(() => {
    if (!player) return;
    // @ts-ignore
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  // Seek handlers
  const handleSeekStart = useCallback(() => {
    isSeeking.current = true;
  }, []);

  const handleSeekChange = useCallback((value: number) => {
    setDisplayTime(value);
  }, []);

  const handleSeekComplete = useCallback((value: number) => {
    if (player) {
      // @ts-ignore
      player.currentTime = value;
      currentTimeRef.current = value;
    }
    isSeeking.current = false;
  }, [player]);

  // Skip forward/backward 10s
  const handleSkip = useCallback((seconds: number) => {
    if (!player) return;
    // @ts-ignore
    const current = player.currentTime || 0;
    // @ts-ignore
    const dur = player.duration || 0;
    const newTime = Math.max(0, Math.min(dur, current + seconds));
    // @ts-ignore
    player.currentTime = newTime;
    currentTimeRef.current = newTime;
    setDisplayTime(newTime);
  }, [player]);

  // Overlay auto-hide
  const resetOverlayTimeout = useCallback(() => {
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    setShowOverlay(true);
    overlayTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowOverlay(false);
    }, 4000);
  }, [isPlaying]);

  const handleVideoTap = useCallback(() => {
    if (showOverlay) {
      setShowOverlay(false);
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    } else {
      resetOverlayTimeout();
    }
  }, [showOverlay, resetOverlayTimeout]);

  // Mostrar overlay ao pausar
  useEffect(() => {
    if (!isPlaying) {
      setShowOverlay(true);
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    } else {
      resetOverlayTimeout();
    }
  }, [isPlaying]);

  // Controle de velocidade
  const handleSpeedChange = useCallback((speed: number) => {
    if (player) {
      // @ts-ignore
      player.playbackRate = speed;
      setPlaybackRate(speed);
    }
    setShowSpeedMenu(false);
  }, [player]);

  // Toggle CC
  const handleCcToggle = useCallback(() => {
    if (!player || subtitleTracks.length === 0) return;

    if (ccEnabled) {
      // @ts-ignore
      player.subtitleTrack = null;
      setCcEnabled(false);
    } else {
      const ptTrack = subtitleTracks.find(t =>
        t.language === 'pt' || t.language === 'por' ||
        t.label?.toLowerCase().includes('portugu')
      );
      const track = ptTrack || subtitleTracks[0];
      // @ts-ignore
      player.subtitleTrack = track;
      setCcEnabled(true);
    }
  }, [player, ccEnabled, subtitleTracks]);

  // Expor funções para o componente pai via ref
  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (player) {
        // @ts-ignore
        player.currentTime = time;
        currentTimeRef.current = time;
      }
    },
    play: () => {
      player?.play();
    },
    pause: () => {
      player?.pause();
    },
    getCurrentTime: () => currentTimeRef.current,
  }), [player]);

  // Função para salvar progresso
  const saveProgress = useCallback(async (forceCompleted = false) => {
    const currentTime = currentTimeRef.current;

    if (!forceCompleted && Math.abs(currentTime - lastSavedTimeRef.current) < MIN_PROGRESS_DIFF) {
      return;
    }

    try {
      await progressService.saveProgress({
        videoId: video.id,
        watchTime: Math.floor(currentTime),
        completed: forceCompleted,
      });
      lastSavedTimeRef.current = currentTime;
    } catch (error) {
      logger.error('[VideoPlayer] Erro ao salvar progresso:', error);
    }
  }, [video.id]);

  // Restaurar posição inicial
  useEffect(() => {
    if (initialPosition > 0 && !hasRestoredPosition.current && player) {
      const restoreTimeout = setTimeout(() => {
        try {
          // @ts-ignore
          player.currentTime = initialPosition;
          currentTimeRef.current = initialPosition;
          lastSavedTimeRef.current = initialPosition;
          hasRestoredPosition.current = true;
          setDisplayTime(initialPosition);
        } catch (error) {
          logger.error('[VideoPlayer] Erro ao restaurar posição:', error);
        }
      }, 500);

      return () => clearTimeout(restoreTimeout);
    }
  }, [initialPosition, player]);

  // Marca o vídeo como concluído
  const markAsCompleted = useCallback(async () => {
    if (hasMarkedCompleted.current) return;
    hasMarkedCompleted.current = true;
    try {
      await progressService.markAsCompleted(video.id);
      await saveProgress(false);
    } catch (error) {
      logger.error('[VideoPlayer] Erro ao marcar como concluído:', error);
      await saveProgress(true);
    }
    if (onEnded) {
      onEnded();
    }
  }, [video.id, saveProgress, onEnded]);

  // Polling para atualização de tempo + detecção de conclusão
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (player) {
        // @ts-ignore
        const time = player.currentTime || 0;
        // @ts-ignore
        const dur = player.duration || 0;
        currentTimeRef.current = time;

        if (!isSeeking.current) {
          setDisplayTime(time);
        }
        if (dur > 0 && displayDuration !== dur) {
          setDisplayDuration(dur);
        }

        if (onProgressUpdate && dur > 0) {
          onProgressUpdate(time, dur);
        }

        if (
          dur > 0 &&
          time >= dur * COMPLETION_THRESHOLD &&
          !hasMarkedCompleted.current &&
          startedBelowThreshold.current
        ) {
          markAsCompleted();
        }
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [player, onProgressUpdate, markAsCompleted, displayDuration]);

  // Listener para quando o vídeo termina
  useEffect(() => {
    // @ts-ignore
    const subscription = player.addListener('playToEnd', () => {
      markAsCompleted();
    });
    return () => subscription.remove();
  }, [player, markAsCompleted]);

  // Fallback: statusChange para detectar fim
  useEffect(() => {
    // @ts-ignore
    const subscription = player.addListener('statusChange', (event: any) => {
      if (event?.status === 'idle' && currentTimeRef.current > 0 && !hasMarkedCompleted.current) {
        // @ts-ignore
        const dur = player.duration || 0;
        if (dur > 0 && currentTimeRef.current >= dur * COMPLETION_THRESHOLD) {
          markAsCompleted();
        }
      }
    });
    return () => subscription.remove();
  }, [player, markAsCompleted]);

  // Auto-save a cada 10 segundos
  useEffect(() => {
    saveIntervalRef.current = setInterval(() => {
      saveProgress(false);
    }, SAVE_INTERVAL_MS);

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [saveProgress]);

  // Salvar ao ir para background ou ao desmontar
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        saveProgress(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      saveProgress(false);
    };
  }, [saveProgress]);

  // Fullscreen gerenciado via lockAsync no botao (ver TouchableOpacity expand).
  // App e portrait-only globalmente (app.json), entao nao escutamos rotacao de device.
  // Cleanup: ao desmontar em fullscreen, devolve portrait pra nao prender o app em landscape.
  useEffect(() => {
    return () => {
      if (isFullscreenRef.current) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {
          // ignore: best-effort cleanup
        });
      }
    };
  }, []);

  // Entrar em fullscreen: gira pra landscape ANTES de enterFullscreen, pra transicao ficar fluida.
  const requestFullscreen = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } catch (err) {
      logger.warn('[VideoPlayer] Falha ao girar pra landscape:', err);
    }
    videoViewRef.current?.enterFullscreen();
  }, []);

  // Sincronizar estado ao entrar/sair do fullscreen. expo-video dispara
  // onFullscreenExit tanto via botao nativo quanto gesto. Ao sair, volta pra portrait.
  const handleFullscreenExit = useCallback(() => {
    isFullscreenRef.current = false;
    setIsFullscreen(false);
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch((err) => {
      logger.warn('[VideoPlayer] Falha ao voltar pra portrait:', err);
    });
  }, []);

  const handleFullscreenEnter = useCallback(() => {
    isFullscreenRef.current = true;
    setIsFullscreen(true);
  }, []);

  // Fechar menu de velocidade ao clicar fora
  const dismissSpeedMenu = useCallback(() => {
    setShowSpeedMenu(false);
  }, []);

  if (!streamUrl) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="videocam-off-outline" size={32} color="#555" style={{ marginBottom: 8 }} />
        <Text style={styles.errorText}>Vídeo indisponível</Text>
        <Text style={styles.errorSubText}>
          Este vídeo ainda não está pronto para reprodução.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Player */}
      <View style={styles.container}>
        <VideoView
          ref={videoViewRef}
          style={styles.video}
          player={player}
          allowsPictureInPicture
          startsPictureInPictureAutomatically
          nativeControls={isFullscreen}
          onFullscreenEnter={handleFullscreenEnter}
          onFullscreenExit={handleFullscreenExit}
        />

        {/* Overlay Liquid Glass */}
        {!isFullscreen && (
          <Pressable style={styles.overlay} onPress={handleVideoTap}>
            {showOverlay && (
              <View style={styles.overlayContent}>
                {/* Botões centrais com glass */}
                <View style={styles.centerControls}>
                  <TouchableOpacity
                    onPress={() => handleSkip(-10)}
                    activeOpacity={0.6}
                    style={styles.glassSkipButton}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <BlurView intensity={40} tint="dark" style={styles.glassSkipBlur}>
                      <Ionicons name="play-back" size={22} color="rgba(255,255,255,0.9)" />
                    </BlurView>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handlePlayPause}
                    activeOpacity={0.6}
                    style={styles.glassPlayButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <BlurView intensity={50} tint="dark" style={styles.glassPlayBlur}>
                      <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={32}
                        color="#fff"
                      />
                    </BlurView>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleSkip(10)}
                    activeOpacity={0.6}
                    style={styles.glassSkipButton}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <BlurView intensity={40} tint="dark" style={styles.glassSkipBlur}>
                      <Ionicons name="play-forward" size={22} color="rgba(255,255,255,0.9)" />
                    </BlurView>
                  </TouchableOpacity>
                </View>

                {/* Seek bar glass na base */}
                <View style={styles.bottomControls}>
                  <BlurView intensity={35} tint="dark" style={styles.glassSeekBar}>
                    <Text style={styles.timeText}>{formatTime(displayTime)}</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={displayDuration || 1}
                      value={displayTime}
                      onSlidingStart={handleSeekStart}
                      onValueChange={handleSeekChange}
                      onSlidingComplete={handleSeekComplete}
                      minimumTrackTintColor="rgba(255,255,255,0.8)"
                      maximumTrackTintColor="rgba(255,255,255,0.15)"
                      thumbTintColor="#fff"
                    />
                    <Text style={styles.timeText}>{formatTime(displayDuration)}</Text>
                  </BlurView>
                </View>
              </View>
            )}
          </Pressable>
        )}
      </View>

      {/* Barra de controles glass */}
      {!isFullscreen && (
        <BlurView intensity={30} tint="dark" style={styles.controlsBar}>
          {/* Velocidade */}
          <TouchableOpacity
            style={[styles.glassChip, showSpeedMenu && styles.glassChipActive]}
            onPress={() => setShowSpeedMenu(!showSpeedMenu)}
            activeOpacity={0.6}
          >
            <Ionicons name="speedometer-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.glassChipText}>
              {playbackRate === 1 ? '1x' : `${playbackRate}x`}
            </Text>
          </TouchableOpacity>

          {/* CC */}
          {subtitleTracks.length > 0 && (
            <TouchableOpacity
              style={[styles.glassChip, ccEnabled && styles.glassChipActive]}
              onPress={handleCcToggle}
              activeOpacity={0.6}
            >
              <Ionicons
                name={ccEnabled ? 'text' : 'text-outline'}
                size={13}
                color={ccEnabled ? '#fff' : 'rgba(255,255,255,0.7)'}
              />
              <Text style={[styles.glassChipText, ccEnabled && styles.glassChipTextActive]}>
                CC
              </Text>
            </TouchableOpacity>
          )}

          {/* Fullscreen: gira pra landscape + entra fullscreen */}
          <TouchableOpacity
            style={[styles.glassChip, { marginLeft: 'auto' }]}
            onPress={requestFullscreen}
            activeOpacity={0.6}
          >
            <Ionicons name="expand-outline" size={14} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </BlurView>
      )}

      {/* Speed menu glass popup */}
      {showSpeedMenu && !isFullscreen && (
        <>
          <Pressable style={styles.speedOverlay} onPress={dismissSpeedMenu} />
          <BlurView intensity={60} tint="dark" style={styles.speedMenu}>
            <Text style={styles.speedMenuTitle}>Velocidade</Text>
            {SPEED_OPTIONS.map((speed) => (
              <TouchableOpacity
                key={speed}
                style={[
                  styles.speedOption,
                  playbackRate === speed && styles.speedOptionActive,
                ]}
                onPress={() => handleSpeedChange(speed)}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    styles.speedOptionText,
                    playbackRate === speed && styles.speedOptionTextActive,
                  ]}
                >
                  {speed === 1 ? 'Normal' : `${speed}x`}
                </Text>
                {playbackRate === speed && (
                  <Ionicons name="checkmark-circle" size={16} color="rgba(255,255,255,0.9)" />
                )}
              </TouchableOpacity>
            ))}
          </BlurView>
        </>
      )}
    </View>
  );
});

export default VideoPlayer;

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    position: 'relative',
  },
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  overlayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Glass center controls
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  glassSkipButton: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  glassSkipBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  glassPlayButton: {
    overflow: 'hidden',
    borderRadius: 32,
  },
  glassPlayBlur: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  // Glass seek bar
  bottomControls: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  glassSeekBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 4,
  },
  slider: {
    flex: 1,
    height: 28,
  },
  timeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  // Error
  errorContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  errorSubText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Glass controls bar
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
    overflow: 'hidden',
  },
  glassChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  glassChipActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  glassChipText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
  },
  glassChipTextActive: {
    color: '#fff',
  },
  // Speed menu glass
  speedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -500,
    zIndex: 98,
  },
  speedMenu: {
    position: 'absolute',
    bottom: 46,
    left: 10,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 150,
    zIndex: 99,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  speedMenuTitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    paddingBottom: 6,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  speedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  speedOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  speedOptionText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '500',
  },
  speedOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
