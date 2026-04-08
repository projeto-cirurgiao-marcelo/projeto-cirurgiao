"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";
import "videojs-contrib-quality-levels";
import "videojs-hls-quality-selector";

export interface HlsPlayerRef {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
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
    {
      src,
      initialTime,
      onTimeUpdate,
      onReady,
      onEnded,
      onPlay,
      onPause,
      className,
    },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const playerRef = useRef<Player | null>(null);

    // Use refs for callbacks to avoid stale closures
    const onTimeUpdateRef = useRef(onTimeUpdate);
    const onReadyRef = useRef(onReady);
    const onEndedRef = useRef(onEnded);
    const onPlayRef = useRef(onPlay);
    const onPauseRef = useRef(onPause);

    useEffect(() => {
      onTimeUpdateRef.current = onTimeUpdate;
    }, [onTimeUpdate]);

    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    useEffect(() => {
      onEndedRef.current = onEnded;
    }, [onEnded]);

    useEffect(() => {
      onPlayRef.current = onPlay;
    }, [onPlay]);

    useEffect(() => {
      onPauseRef.current = onPause;
    }, [onPause]);

    useImperativeHandle(ref, () => ({
      getCurrentTime: () => playerRef.current?.currentTime() ?? 0,
      getDuration: () => playerRef.current?.duration() ?? 0,
      seekTo: (time: number) => {
        playerRef.current?.currentTime(time);
      },
      play: () => {
        playerRef.current?.play();
      },
      pause: () => {
        playerRef.current?.pause();
      },
    }));

    useEffect(() => {
      if (!videoRef.current || playerRef.current) return;

      const player = videojs(videoRef.current, {
        controls: true,
        autoplay: false,
        preload: "auto",
        responsive: true,
        fill: true,
        playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
        controlBar: {
          children: [
            "playToggle",
            "volumePanel",
            "currentTimeDisplay",
            "timeDivider",
            "durationDisplay",
            "progressControl",
            "remainingTimeDisplay",
            "playbackRateMenuButton",
            "chaptersButton",
            "subtitlesButton",
            "captionsButton",
            "pictureInPictureToggle",
            "fullscreenToggle",
          ],
        },
        html5: {
          vhs: {
            overrideNative: true,
            enableLowInitialPlaylist: false,
          },
          nativeAudioTracks: false,
          nativeVideoTracks: false,
        },
        sources: [
          {
            src,
            type: "application/x-mpegURL",
          },
        ],
      });

      // Activate quality selector plugin
      (player as any).hlsQualitySelector({ displayCurrentQuality: true });

      player.on("loadedmetadata", () => {
        const duration = player.duration() ?? 0;
        onReadyRef.current?.(duration);

        if (initialTime && initialTime > 0) {
          player.currentTime(initialTime);
        }
      });

      player.on("timeupdate", () => {
        const currentTime = player.currentTime() ?? 0;
        const duration = player.duration() ?? 0;
        onTimeUpdateRef.current?.(currentTime, duration);
      });

      player.on("ended", () => {
        onEndedRef.current?.();
      });

      player.on("play", () => {
        onPlayRef.current?.();
      });

      player.on("pause", () => {
        onPauseRef.current?.();
      });

      playerRef.current = player;

      return () => {
        if (playerRef.current) {
          playerRef.current.dispose();
          playerRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className={className} data-vjs-player>
        <video
          ref={videoRef}
          className="video-js vjs-big-play-centered"
          playsInline
          crossOrigin="anonymous"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    );
  }
);

export default HlsVideoPlayer;
