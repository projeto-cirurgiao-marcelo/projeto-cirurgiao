/**
 * Cliente HTTP base com Axios - Migrado do frontend-web
 * Configurado com interceptors para autenticação Firebase
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth';

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
      console.error('Erro ao obter token:', error);
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
          console.log('Token refresh falhou, limpando sessão...');
        }
        isRefreshing = false;
      }

      // Refresh falhou ou não há usuário - limpar sessão
      await AsyncStorage.removeItem('firebaseToken');
      await AsyncStorage.removeItem('auth-storage');
      // A navegação para login será tratada pelo AuthProvider
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