import { useCallback, useRef } from 'react';
import { Audio, AVPlaybackSource } from 'expo-av';
import { useAudioOutput } from './useAudioOutput';

type SoundKey = 'correct' | 'wrong' | 'combo' | 'levelup' | 'badge' | 'streak';

// Stub paths — assets ficam em mobile-app/src/assets/sounds/.
// Manter undefined até arquivos chegarem (Sprint asset). useSound vira no-op se source=undefined.
const SOURCES: Partial<Record<SoundKey, AVPlaybackSource>> = {
  // correct: require('../assets/sounds/correct.mp3'),
  // wrong:   require('../assets/sounds/wrong.mp3'),
  // combo:   require('../assets/sounds/combo.mp3'),
  // levelup: require('../assets/sounds/levelup.mp3'),
  // badge:   require('../assets/sounds/badge.mp3'),
  // streak:  require('../assets/sounds/streak.mp3'),
};

type AudioPref = 'AUTO' | 'ALWAYS' | 'NEVER';

export function useSound(audioPreference: AudioPref = 'AUTO') {
  const { headphonesConnected } = useAudioOutput();
  const playingRef = useRef(false);

  const play = useCallback(
    async (key: SoundKey) => {
      if (audioPreference === 'NEVER') return;
      if (audioPreference === 'AUTO' && !headphonesConnected) return;

      const src = SOURCES[key];
      if (!src) return; // assets ainda não fornecidos — no-op silencioso

      if (playingRef.current) return; // evita overlap em rajadas
      playingRef.current = true;
      try {
        const { sound } = await Audio.Sound.createAsync(src, { shouldPlay: true });
        sound.setOnPlaybackStatusUpdate((s: any) => {
          if (s?.didJustFinish) sound.unloadAsync().catch(() => null);
        });
      } catch {
        // best-effort
      } finally {
        setTimeout(() => {
          playingRef.current = false;
        }, 200);
      }
    },
    [audioPreference, headphonesConnected],
  );

  return { play };
}
