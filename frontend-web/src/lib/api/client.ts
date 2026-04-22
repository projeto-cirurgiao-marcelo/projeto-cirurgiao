import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Extrai `Retry-After` do response 429. Retorna segundos (inteiro >= 0)
 * ou `null` se o header estiver ausente/inválido.
 *
 * Aceita tanto o formato delta-seconds ("30") quanto HTTP-date
 * ("Wed, 21 Oct 2026 07:28:00 GMT") conforme RFC 7231.
 */
function parseRetryAfter(headers: AxiosError['response'] extends infer R
  ? R extends { headers: infer H } ? H : never
  : never): number | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (headers as any)?.['retry-after'] ?? (headers as any)?.['Retry-After'];
  if (!raw) return null;
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
 * Mostra um toast de rate limit amigável. Sem retry automático — o
 * usuário decide re-submeter a ação quando o countdown terminar.
 *
 * Contrato combinado com backend (ver docs/proposals/429-ux-spec.md):
 * - Título fixo: "Muitas requisições à IA".
 * - Se `Retry-After` presente: descrição com segundos exatos.
 * - Se ausente: descrição genérica ("aguarde alguns segundos").
 */
function showRateLimitToast(retryAfterSec: number | null) {
  const description =
    retryAfterSec !== null
      ? `Aguarde ${retryAfterSec} segundo${retryAfterSec === 1 ? '' : 's'} e tente novamente.`
      : 'Aguarde alguns segundos e tente novamente.';
  toast.error('Muitas requisições à IA', {
    description,
    duration: Math.max(4000, (retryAfterSec ?? 0) * 1000),
  });
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/**
 * Cliente HTTP configurado para comunicação com a API
 * Timeout padrão de 30s — usar uploadClient para operações longas
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos para requests normais
});

/**
 * Cliente HTTP para uploads e operações longas (vídeos, transcrições)
 */
export const uploadClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutos para uploads grandes
});

/**
 * Adiciona interceptors de auth a um client Axios
 */
function applyAuthInterceptors(client: AxiosInstance) {
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = useAuthStore.getState().firebaseToken;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: AxiosError) => Promise.reject(error),
  );

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        useAuthStore.getState().logout();
      }
      if (error.response?.status === 429) {
        // Rate limit por usuario (30 rpm em endpoints de IA) ou por IP.
        // Toast amigavel + respeita Retry-After header. Sem retry
        // automatico — usuario re-submete a acao quando quiser.
        const retryAfter = parseRetryAfter(error.response.headers);
        showRateLimitToast(retryAfter);
      }
      return Promise.reject(error);
    },
  );
}

// Aplicar interceptors em ambos os clients
applyAuthInterceptors(apiClient);
applyAuthInterceptors(uploadClient);

/**
 * Tipo para erros da API
 */
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

/**
 * Função auxiliar para extrair mensagem de erro
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    return apiError?.message || error.message || 'Erro ao processar requisição';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Erro desconhecido';
}
