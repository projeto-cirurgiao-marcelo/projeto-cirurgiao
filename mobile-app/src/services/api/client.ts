/**
 * Cliente HTTP base com Axios - Migrado do frontend-web
 * Configurado com interceptors para autenticação Firebase
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import secureStorage from '../../lib/secure-storage';
import { auth } from '../firebase';
import Toast from 'react-native-toast-message';

/**
 * Extrai `Retry-After` do response 429. Retorna segundos (inteiro >= 0)
 * ou `null` se o header estiver ausente/invalido.
 *
 * Aceita tanto delta-seconds ("30") quanto HTTP-date
 * ("Wed, 21 Oct 2026 07:28:00 GMT") conforme RFC 7231.
 *
 * Copia logica do frontend-web (src/lib/api/client.ts) — mesmo contrato.
 */
function parseRetryAfter(headers: unknown): number | null {
  if (!headers || typeof headers !== 'object') return null;
  // Axios lowercase-ifica headers em alguns paths mas nao em outros — checa os dois.
  const raw = (headers as Record<string, unknown>)['retry-after']
    ?? (headers as Record<string, unknown>)['Retry-After'];
  if (raw === undefined || raw === null) return null;
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber >= 0) return Math.ceil(asNumber);
  const asDate = Date.parse(String(raw));
  if (Number.isFinite(asDate)) {
    const diff = Math.ceil((asDate - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  }
  return null;
}

/**
 * Mostra toast amigavel de rate limit. Sem retry automatico — usuario
 * decide re-submeter quando quiser.
 *
 * Contrato textual combinado com frontend-web (ver
 * cirurgiao-web/docs/proposals/429-ux-spec.md):
 * - text1 fixo: "Muitas requisicoes a IA".
 * - text2 dinamico: se `Retry-After` vier, mostra segundos exatos com
 *   plural correto; senao mensagem generica.
 * - visibilityTime: max(4000ms, retryAfter * 1000ms).
 */
function showRateLimitToast(retryAfterSec: number | null) {
  const description =
    retryAfterSec !== null
      ? `Aguarde ${retryAfterSec} segundo${retryAfterSec === 1 ? '' : 's'} e tente novamente.`
      : 'Aguarde alguns segundos e tente novamente.';
  Toast.show({
    type: 'error',
    text1: 'Muitas requisições à IA',
    text2: description,
    visibilityTime: Math.max(4000, (retryAfterSec ?? 0) * 1000),
  });
}

// URL base da API - ajustar conforme ambiente
// Para Android Emulator, use 10.0.2.2 ao invés de localhost
// Para dispositivo físico, use o IP da sua máquina na rede local
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api/v1';

// Criar instância do axios
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutos para uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

type SessionRequest = InternalAxiosRequestConfig & { _retry?: boolean; _sessionVersion?: number };
let sessionVersion = 0;
let refreshPromise: Promise<string> | null = null;
let tokenWrite: Promise<void> = Promise.resolve();
let authHandlers: {
  onTokenChanged: (token: string) => void;
  onSessionExpired: () => Promise<void>;
} | undefined;

// Registered by the store, avoiding a client -> store -> client import cycle.
export function configureApiAuth(handlers: NonNullable<typeof authHandlers>) {
  authHandlers = handlers;
}

export function resetApiSession(): Promise<void> {
  sessionVersion += 1;
  refreshPromise = null;
  // Queue removal after any pending write so logout cannot resurrect a token.
  tokenWrite = tokenWrite.catch(() => {}).then(() => secureStorage.removeItem('firebaseToken'));
  return tokenWrite;
}

function persistToken(token: string, version: number): Promise<void> {
  tokenWrite = tokenWrite.catch(() => {}).then(async () => {
    if (version !== sessionVersion) return;
    await secureStorage.setItem('firebaseToken', token);
    if (version === sessionVersion) authHandlers?.onTokenChanged(token);
  });
  return tokenWrite;
}

function isInvalidFirebaseSession(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return ['auth/user-disabled', 'auth/user-not-found', 'auth/user-token-expired',
    'auth/invalid-user-token'].includes(code ?? '');
}

// Firebase is the token source, including after a password change or cold start.
apiClient.interceptors.request.use(
  async (config: SessionRequest) => {
    const version = config._sessionVersion ?? sessionVersion;
    config._sessionVersion = version;
    await auth.authStateReady();
    if (version !== sessionVersion) throw new axios.CanceledError('Session changed');
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        if (version !== sessionVersion || auth.currentUser !== user) {
          throw new axios.CanceledError('Session changed');
        }
        await persistToken(token, version);
        if (version !== sessionVersion) throw new axios.CanceledError('Session changed');
        config.headers.set('Authorization', `Bearer ${token}`);
        // This endpoint validates the body, not the Authorization header.
        if (config.url === '/auth/firebase-login') {
          config.data = { firebaseToken: token };
        }
      } else {
        config.headers.delete('Authorization');
      }
    } catch (error) {
      if (version === sessionVersion && isInvalidFirebaseSession(error)) {
        await authHandlers?.onSessionExpired();
      }
      throw error;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Interceptor de response - tenta refresh do token antes de fazer logout
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const version = (response.config as SessionRequest)._sessionVersion;
    if (version !== undefined && version !== sessionVersion) {
      throw new axios.CanceledError('Session changed');
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as SessionRequest | undefined;
    const version = originalRequest?._sessionVersion;

    if (error.response?.status === 401 && originalRequest && version === sessionVersion) {
      const user = auth.currentUser;
      if (originalRequest._retry || !user) {
        await authHandlers?.onSessionExpired();
        return Promise.reject(error);
      }
      originalRequest._retry = true;

      if (!refreshPromise) {
        const pending = user.getIdToken(true).then(async (token) => {
          if (version !== sessionVersion || auth.currentUser !== user) {
            throw new axios.CanceledError('Session changed');
          }
          await persistToken(token, version);
          return token;
        });
        refreshPromise = pending;
        void pending.finally(() => {
          if (refreshPromise === pending) refreshPromise = null;
        }).catch(() => {});
      }

      try {
        await refreshPromise;
      } catch (refreshError) {
        // Offline/timeouts must not destroy a recoverable Firebase session.
        if (version === sessionVersion && isInvalidFirebaseSession(refreshError)) {
          await authHandlers?.onSessionExpired();
        }
        return Promise.reject(refreshError);
      }
      if (version !== sessionVersion) throw new axios.CanceledError('Session changed');
      return apiClient(originalRequest);
    }

    // Rate limit por usuario (30 rpm em endpoints de IA) ou por IP. Toast
    // amigavel + respeita Retry-After header. Sem retry automatico — usuario
    // re-submete a acao quando quiser. Promise continua rejeitando pros
    // services/componentes desligarem spinners e tratarem localmente.
    if (error.response?.status === 429) {
      const retryAfter = parseRetryAfter(error.response.headers);
      showRateLimitToast(retryAfter);
    }

    return Promise.reject(error);
  }
);

// Função helper para tratar erros da API
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }
    if (axiosError.message) {
      return axiosError.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocorreu um erro inesperado';
}

export default apiClient;
