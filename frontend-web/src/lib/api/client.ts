import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/lib/stores/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/**
 * Cliente HTTP configurado para comunicação com a API
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5 minutos para permitir uploads de vídeos grandes
});

/**
 * Interceptor de requisição para adicionar token de autenticação
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Pega o token do Zustand store primeiro (mais confiável que localStorage)
    const firebaseToken = useAuthStore.getState().firebaseToken;
    
    // Fallback para localStorage se não estiver no store ainda
    const localToken = localStorage.getItem('firebaseToken') || localStorage.getItem('accessToken');
    
    const token = firebaseToken || localToken;
    
    if (token && config.headers) {
      console.log('🔑 [API Client] Token anexado ao header:', token.substring(0, 20) + '...');
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('⚠️ [API Client] Nenhum token disponível para a requisição');
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor de resposta para tratamento de erros
 * Firebase gerencia refresh automaticamente
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Se o erro for 401, significa que o token expirou ou é inválido
    if (error.response?.status === 401) {
      // Limpa o localStorage e redireciona para login
      localStorage.removeItem('firebaseToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      // Redireciona para login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

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
