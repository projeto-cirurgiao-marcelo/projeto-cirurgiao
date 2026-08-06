import { useCallback, useRef } from 'react';
import { createAudioPlayer } from 'expo-audio';

type SoundKey = 'correct' | 'wrong' | 'combo' | 'levelup' | 'badge' | 'streak';

// Stub paths — assets ficam em mobile-app/src/assets/sounds/.
// Manter undefined até arquivos chegarem (Sprint asset). useSound vira no-op se source=undefined.
const SOURCES: Partial<Record<SoundKey, number>> = {
  // correct: require('../assets/sounds/correct.mp3'),
  // wrong:   require('../assets/sounds/wrong.mp3'),
  // combo:   require('../assets/sounds/combo.mp3'),
  // levelup: require('../assets/sounds/levelup.mp3'),
  // badge:   require('../assets/sounds/badge.mp3'),
  // streak:  require('../assets/sounds/streak.mp3'),
};

type AudioPref = 'AUTO' | 'ALWAYS' | 'NEVER';

/**
 * Efeitos sonoros curtos do quiz/gamificação.
 *
 * **Semântica de `AUTO` mudou nesta migração (expo-av → expo-audio).** Antes
 * era "só toca com fone conectado", apoiado numa detecção que **só funcionava
 * no iOS**: `useAudioOutput` comparava nomes de porta do AVAudioSession
 * (`BluetoothA2DP`, `WiredHeadphones`, `LineOut`…), de modo que no Android caía
 * sempre no fallback `false` e silenciava tudo.
 *
 * O `expo-audio` não expõe rota/porta de saída — a API de dispositivos cobre
 * apenas *inputs* de gravação —, então aquela regra não tem como ser
 * reimplementada de forma multiplataforma. `AUTO` passa a significar **"toca,
 * respeitando volume e silencioso do sistema"**, que é o controle que o usuário
 * já tem no aparelho. Quem não quiser som em hipótese alguma usa `NEVER`.
 *
 * ponytail: sem os assets em `SOURCES` isto é no-op em qualquer plataforma — o
 * efeito prático da mudança só aparece quando os sons forem fornecidos.
 */
export function useSound(audioPreference: AudioPref = 'AUTO') {
  const playingRef = useRef(false);

  const play = useCallback(
    async (key: SoundKey) => {
      if (audioPreference === 'NEVER') return;

      const src = SOURCES[key];
      if (!src) return; // assets ainda não fornecidos — no-op silencioso

      if (playingRef.current) return; // evita overlap em rajadas
      playingRef.current = true;
      try {
        const player = createAudioPlayer(src);
        player.play();
        // Libera o recurso nativo depois do efeito. São sons curtos; um timer
        // é mais simples que assinar o status só para descarregar.
        setTimeout(() => {
          try {
            player.remove();
          } catch {
            // best-effort
          }
        }, 5000);
      } catch {
        // best-effort
      } finally {
        setTimeout(() => {
          playingRef.current = false;
        }, 200);
      }
    },
    [audioPreference],
  );

  return { play };
}
