/**
 * Smoke test do hook `useNetworkStatus`.
 *
 * Exercita o comportamento mais critico: transicao offline -> online deve
 * respeitar o debounce de 500ms. Usa `jest.useFakeTimers()` pra nao precisar
 * rodar o test por 500ms reais.
 *
 * O mock de NetInfo em jest.setup.ts exporta um helper __emit que dispara
 * eventos sinteticos em todos os listeners registrados.
 */
import { renderHook, act } from '@testing-library/react-native';
import NetInfoMock from '@react-native-community/netinfo';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';

// Tipo narrow pro helper que adicionamos no mock.
type NetInfoTestable = typeof NetInfoMock & {
  __emit: (state: { isConnected: boolean; isInternetReachable?: boolean | null }) => void;
};

const NetInfo = NetInfoMock as unknown as NetInfoTestable;

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('default to online on mount', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
    expect(result.current.onlineSince).toBeNull();
  });

  it('flips to offline imediatamente quando rede cai (sem debounce)', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      NetInfo.__emit({ isConnected: false, isInternetReachable: false });
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.onlineSince).toBeNull();
  });

  it('so volta a online apos 500ms de debounce estavel', () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Offline primeiro.
    act(() => {
      NetInfo.__emit({ isConnected: false, isInternetReachable: false });
    });
    expect(result.current.isOnline).toBe(false);

    // Rede volta — mas so depois de 500ms debounce o hook deve atualizar.
    act(() => {
      NetInfo.__emit({ isConnected: true, isInternetReachable: true });
    });
    // Ainda nao passou o debounce. isOnline deve permanecer false.
    expect(result.current.isOnline).toBe(false);

    // Avanca 499ms — ainda offline.
    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(result.current.isOnline).toBe(false);

    // Avanca +1ms (total 500) — debounce dispara, vira online.
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.isOnline).toBe(true);
    expect(result.current.onlineSince).not.toBeNull();
  });

  it('cancela debounce se rede cair de novo dentro dos 500ms', () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Offline -> online -> offline rapido, tudo dentro dos 500ms.
    act(() => {
      NetInfo.__emit({ isConnected: false, isInternetReachable: false });
    });
    act(() => {
      NetInfo.__emit({ isConnected: true, isInternetReachable: true });
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    act(() => {
      NetInfo.__emit({ isConnected: false, isInternetReachable: false });
    });

    // Avanca alem dos 500ms — debounce NAO deve ter disparado porque foi cancelado.
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.onlineSince).toBeNull();
  });

  it('trata isInternetReachable=null como online (probe em andamento)', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      NetInfo.__emit({ isConnected: true, isInternetReachable: null });
    });

    // null nao e false — hook nao derruba online.
    expect(result.current.isOnline).toBe(true);
  });
});
