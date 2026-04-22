import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { firebaseAuthService, type FirebaseAuthUser } from '../firebase/auth.service';
import { logger } from '../logger';
import { maskEmail } from '../utils/mask-pii';
import axios from 'axios';

// Tipo do usuário no backend (com role)
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STUDENT' | 'INSTRUCTOR';
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseAuthUser | null;
  firebaseToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hasHydrated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/**
 * Store de autenticação usando Firebase + Backend
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      firebaseUser: null,
      firebaseToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hasHydrated: false,

      /**
       * Realiza login com Firebase e sincroniza com backend
       */
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          logger.log('🔥 [Firebase] Iniciando login...');
          
          // 1. Login no Firebase
          const firebaseResult = await firebaseAuthService.login(email, password);
          
          if (!firebaseResult.success || !firebaseResult.token) {
            throw new Error(firebaseResult.error || 'Falha no login Firebase');
          }

          logger.log('✅ [Firebase] Login bem sucedido');
          logger.log('🔄 [Backend] Sincronizando usuário...');

          // 2. Sincroniza com backend e busca role
          const backendResponse = await axios.post(`${API_URL}/auth/firebase-login`, {
            firebaseToken: firebaseResult.token,
          });

          const backendUser = backendResponse.data.user;

          logger.log('✅ [Backend] Usuário sincronizado:', backendUser
            ? { ...backendUser, email: maskEmail(backendUser.email) }
            : null);

          // 3. Salva no estado
          set({
            user: backendUser,
            firebaseUser: firebaseResult.user,
            firebaseToken: firebaseResult.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          logger.error('❌ [Login] Erro:', error);
          const errorMessage = error.response?.data?.message || error.message || 'Erro ao fazer login';
          set({
            isLoading: false,
            error: errorMessage,
            user: null,
            firebaseUser: null,
            firebaseToken: null,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      /**
       * Registra novo usuário no Firebase
       */
      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });

        try {
          logger.log('🔥 [Firebase] Iniciando registro...');
          
          // 1. Cria conta no Firebase
          const firebaseResult = await firebaseAuthService.register(email, password, name);
          
          if (!firebaseResult.success || !firebaseResult.token) {
            throw new Error(firebaseResult.error || 'Falha no registro Firebase');
          }

          logger.log('✅ [Firebase] Registro bem sucedido');
          logger.log('🔄 [Backend] Sincronizando usuário...');

          // 2. Sincroniza com backend
          const backendResponse = await axios.post(`${API_URL}/auth/firebase-login`, {
            firebaseToken: firebaseResult.token,
          });

          const backendUser = backendResponse.data.user;

          logger.log('✅ [Backend] Usuário criado:', backendUser
            ? { ...backendUser, email: maskEmail(backendUser.email) }
            : null);

          // 3. Salva no estado (Zustand persist handles localStorage)
          set({
            user: backendUser,
            firebaseUser: firebaseResult.user,
            firebaseToken: firebaseResult.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          logger.error('❌ [Register] Erro:', error);
          const errorMessage = error.response?.data?.message || error.message || 'Erro ao registrar';
          set({
            isLoading: false,
            error: errorMessage,
            user: null,
            firebaseUser: null,
            firebaseToken: null,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      /**
       * Realiza logout e redireciona para /login
       */
      logout: async () => {
        try {
          await firebaseAuthService.logout();
        } catch (error) {
          logger.error('❌ [Logout] Erro:', error);
        } finally {
          // Zustand persist will clear localStorage automatically
          set({
            user: null,
            firebaseUser: null,
            firebaseToken: null,
            isAuthenticated: false,
            error: null,
          });
          // Redirect to login — uses window.location to ensure full state reset
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
      },

      /**
       * Carrega usuário do Firebase e valida com backend
       */
      loadUser: async () => {
        // Tenta pegar o token do state (hidratado pelo persist) primeiro
        const currentState = get();
        const token = currentState.firebaseToken || localStorage.getItem('firebaseToken');
        
        if (!token) {
          logger.log('⚠️ [loadUser] Sem token Firebase');
          set({ user: null, isAuthenticated: false });
          return;
        }

        logger.log('🔄 [loadUser] Validando token Firebase...');
        set({ isLoading: true });

        try {
          // Tenta sincronizar com backend
          const response = await axios.post(`${API_URL}/auth/firebase-login`, {
            firebaseToken: token,
          });

          const backendUser = response.data.user;
          const firebaseUser = firebaseAuthService.getCurrentUser();

          logger.log('✅ [loadUser] Token válido, usuário carregado');

          set({
            user: backendUser,
            firebaseUser,
            firebaseToken: token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          logger.error('❌ [loadUser] Token inválido ou expirado:', error);
          
          set({
            user: null,
            firebaseUser: null,
            firebaseToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Sessão expirada',
          });
        }
      },

      /**
       * Limpa mensagem de erro
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage-firebase',
      partialize: (state) => ({
        user: state.user,
        firebaseToken: state.firebaseToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
          logger.log('🔄 [Auth] Zustand hidratado:', {
            hasUser: !!state.user,
            hasToken: !!state.firebaseToken,
            isAuthenticated: state.isAuthenticated,
          });
        }
      },
    }
  )
);
