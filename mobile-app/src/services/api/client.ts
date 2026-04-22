/**
 * Cliente HTTP base com Axios - Migrado do frontend-web
 * Configurado com interceptors para autenticação Firebase
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth';
import Toast from 'react-native-toast-message';
import { logger } from '../../lib/logger';

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

// Interceptor de request - adiciona token de autenticação
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem('firebaseToken');
      if (token) {
        if (!config.headers) {
          config.headers = new axios.AxiosHeaders();
        }
        // Garante que o header é setado corretamente em qualquer versão do Axios
        if (typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else {
          (config.headers as any)['Authorization'] = `Bearer ${token}`;
        }
      }
    } catch (error) {
      logger.error('[apiClient] Erro ao obter token:', error);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Flag para evitar múltiplos refreshes simultâneos
let isRefreshing = false;

// Interceptor de response - tenta refresh do token antes de fazer logout
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const auth = getAuth();
          const currentUser = auth.currentUser;

          if (currentUser) {
            // Forçar refresh do token Firebase
            const newToken = await currentUser.getIdToken(true);
            await AsyncStorage.setItem('firebaseToken', newToken);
            isRefreshing = false;

            // Retentar a request original com o novo token
            if (typeof originalRequest.headers.set === 'function') {
              originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
            } else {
              (originalRequest.headers as any)['Authorization'] = `Bearer ${newToken}`;
            }
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          logger.warn('[apiClient] Token refresh falhou, limpando sessão', refreshError);
        }
        isRefreshing = false;
      }

      // Refresh falhou ou não há usuário - limpar sessão
      await AsyncStorage.removeItem('firebaseToken');
      await AsyncStorage.removeItem('auth-storage');
      // A navegação para login será tratada pelo AuthProvider
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