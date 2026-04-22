/**
 * useNetworkStatus — hook unificado de status de rede para o mobile.
 *
 * Fornece:
 * - `isOnline` (boolean): true quando a rede esta reportada como conectada E
 *   alcancavel. `state.isConnected === true` sozinho nao garante acesso real
 *   (ex: wifi sem internet), entao combinamos com `isInternetReachable`. Se
 *   `isInternetReachable` vier `null` (ainda sondando), tratamos como online
 *   pra evitar "fantasmas" offline no boot.
 * - `wasOffline` (boolean): pulso que vira `true` por 1 render apos uma
 *   reconexao (estava offline e voltou). Consumer pode usar como trigger de
 *   refetch. Reseta automaticamente.
 * - `onlineSince` (number | null): timestamp (ms) da ultima transicao
 *   offline -> online. Util pra key em useEffect: quando muda, re-roda.
 *
 * Debounce de 500ms em transicoes offline -> online:
 * troca wifi↔4G pode flapping rapido (down, up, down, up). Sem debounce,
 * telas de lista fariam refetch-storm em segundos. Aguardar 500ms estavel
 * online antes de disparar `wasOffline`/atualizar `onlineSince`.
 *
 * Transicao online -> offline e imediata (sem debounce) — queremos derrubar
 * requisicoes pendentes o mais rapido possivel.
 */

import { useEffect, useRef, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  onlineSince: number | null;
}

const RECONNECT_DEBOUNCE_MS = 500;

function computeOnline(state: NetInfoState): boolean {
  if (!state.isConnected) return false;
  // isInternetReachable pode ser null (probe em andamento). Nao derrubamos
  // a UI nesse estado — so tratamos como offline quando explicitamente false.
  return state.isInternetReachable !== false;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [onlineSince, setOnlineSince] = useState<number | null>(null);

  // Refs pra manter referencia estavel dentro do listener (NetInfo chama fora
  // do ciclo de render do React).
  const wasOfflineRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nowOnline = computeOnline(state);

      if (!nowOnline) {
        // Offline: derruba imediatamente. Cancela qualquer debounce pendente.
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        wasOfflineRef.current = true;
        setIsOnline(false);
        setWasOffline(false); // reset pulso
        return;
      }

      // Online: se ja estavamos online, no-op (evita re-renders).
      if (!wasOfflineRef.current) {
        setIsOnline(true);
        return;
      }

      // Transicao offline -> online com debounce. Se outro evento offline
      // chegar dentro dos 500ms, o timer sera cancelado acima.
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        wasOfflineRef.current = false;
        const ts = Date.now();
        setIsOnline(true);
        setOnlineSince(ts);
        setWasOffline(true);
        // Consumer ve wasOffline=true por 1 render. Limpa no proximo tick.
        setTimeout(() => setWasOffline(false), 0);
        debounceTimerRef.current = null;
      }, RECONNECT_DEBOUNCE_MS);
    });

    // Primeira leitura sincrona pra nao confiar apenas no evento inicial.
    NetInfo.fetch().then((state) => {
      setIsOnline(computeOnline(state));
    }).catch(() => {
      // ignore: mantem default (online).
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return { isOnline, wasOffline, onlineSince };
}

export default useNetworkStatus;
