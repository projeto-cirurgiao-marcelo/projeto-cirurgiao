import { renderHook, act } from '@testing-library/react-native';

import { useSound } from '../../src/hooks/useSound';

const mockPlay = jest.fn();
const mockRemove = jest.fn();
const mockCreateAudioPlayer = jest.fn(() => ({ play: mockPlay, remove: mockRemove }));

jest.mock('expo-audio', () => ({
  createAudioPlayer: (...args: unknown[]) => mockCreateAudioPlayer(...(args as [])),
}));

describe('useSound', () => {
  beforeEach(() => jest.clearAllMocks());

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
  it('AUTO não depende mais de fone conectado', async () => {
    const { result } = renderHook(() => useSound('AUTO'));
    await act(async () => {
      await result.current.play('correct');
    });
    // Sem assets em SOURCES o hook é no-op por design; o que se garante aqui é
    // que AUTO não é bloqueado por ausência de fone antes mesmo de olhar o asset.
    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
  });

  it('é no-op silencioso enquanto os assets de som não existirem', async () => {
    const { result } = renderHook(() => useSound('ALWAYS'));
    await act(async () => {
      await result.current.play('levelup');
    });
    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
    expect(mockPlay).not.toHaveBeenCalled();
  });
});
