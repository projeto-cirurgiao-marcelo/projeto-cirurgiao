import { renderHook, act } from '@testing-library/react-native';

import { useSound } from '../../src/hooks/useSound';

const mockPlay = jest.fn();
const mockRemove = jest.fn();
const mockCreateAudioPlayer = jest.fn(() => ({ play: mockPlay, remove: mockRemove }));

jest.mock('expo-audio', () => ({
  createAudioPlayer: (...args: unknown[]) => mockCreateAudioPlayer(...(args as [])),
}));

describe('useSound', () => {
  // Fake timers: play() agenda a liberação do player com setTimeout; sem isso
  // os timers pendentes seguram o worker do Jest depois da suite.
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('não toca nada com preferência NEVER', async () => {
    const { result } = renderHook(() => useSound('NEVER'));
    await act(async () => {
      await result.current.play('correct');
    });
    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
  });

  /**
   * Guarda a mudança de semântica da migração expo-av → expo-audio: AUTO
   * costumava exigir fone conectado, o que no Android silenciava tudo porque a
   * detecção era iOS-only. Agora AUTO toca — quem não quer som usa NEVER.
   */
  it('AUTO toca sem depender de fone conectado', async () => {
    const { result } = renderHook(() => useSound('AUTO'));
    await act(async () => {
      await result.current.play('correct');
    });
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it.each(['correct', 'wrong', 'combo', 'levelup'] as const)(
    'toca o asset de %s',
    async (key) => {
      const { result } = renderHook(() => useSound('ALWAYS'));
      await act(async () => {
        await result.current.play(key);
      });
      expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
      expect(mockPlay).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['badge', 'streak'] as const)(
    'é no-op silencioso para %s (sem asset aprovado)',
    async (key) => {
      const { result } = renderHook(() => useSound('ALWAYS'));
      await act(async () => {
        await result.current.play(key);
      });
      expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
      expect(mockPlay).not.toHaveBeenCalled();
    },
  );
});
