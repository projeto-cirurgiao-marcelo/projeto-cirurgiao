"use client";

import { useEffect, useRef } from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";
import "videojs-contrib-quality-levels";
import "videojs-hls-quality-selector";

const VIDEO_SRC =
  "https://cdn.projetocirurgiao.app/videos/Biopsia ossea tibia distal_2160p/playlist.m3u8";

export default function TestPlayerPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!videoRef.current || playerRef.current) return;

    const player = videojs(videoRef.current, {
      controls: true,
      autoplay: false,
      preload: "auto",
      fluid: true,
      responsive: true,
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
          src: VIDEO_SRC,
          type: "application/x-mpegURL",
        },
      ],
    });

    // Ativa o plugin de seletor de qualidade
    (player as any).hlsQualitySelector({ displayCurrentQuality: true });

    playerRef.current = player;

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-10 px-4">
      <h1 className="text-white text-2xl font-bold mb-1">
        Tecidos Moles na Prática
      </h1>
      <p className="text-zinc-500 text-sm mb-6">
        Video.js + HLS — Adaptive Bitrate Streaming
      </p>

      <div className="w-full max-w-5xl rounded-xl overflow-hidden shadow-2xl">
        <div data-vjs-player>
          <video
            ref={videoRef}
            className="video-js vjs-big-play-centered"
            playsInline
            crossOrigin="anonymous"
          />
        </div>
      </div>

      <div className="w-full max-w-5xl mt-6 px-5 py-4 bg-zinc-900 rounded-lg text-sm text-zinc-400">
        <h3 className="text-zinc-200 font-semibold mb-3">
          Recursos disponíveis:
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>Play / Pause</div>
          <div>Barra de progresso</div>
          <div>Duração / tempo atual</div>
          <div>Volume / Mute</div>
          <div>Velocidade (0.5x - 2x)</div>
          <div>Legendas / Captions</div>
          <div>Seletor de Qualidade (HD)</div>
          <div>Picture-in-Picture</div>
          <div>Fullscreen</div>
          <div>Adaptive bitrate (auto)</div>
          <div>Keyboard shortcuts</div>
          <div>Responsivo / Fluid</div>
        </div>
      </div>
    </div>
  );
}
