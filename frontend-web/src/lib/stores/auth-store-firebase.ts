import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { firebaseAuthService, type FirebaseAuthUser } from '../firebase/auth.service';
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
          console.log('🔥 [Firebase] Iniciando login...');
          
          // 1. Login no Firebase
          const firebaseResult = await firebaseAuthService.login(email, password);
          
          if (!firebaseResult.success || !firebaseResult.token) {
            throw new Error(firebaseResult.error || 'Falha no login Firebase');
          }

          console.log('✅ [Firebase] Login bem sucedido');
          console.log('🔄 [Backend] Sincronizando usuário...');

          // 2. Sincroniza com backend e busca role
          const backendResponse = await axios.post(`${API_URL}/auth/firebase-login`, {
            firebaseToken: firebaseResult.token,
          });

          const backendUser = backendResponse.data.user;

          console.log('✅ [Backend] Usuário sincronizado:', backendUser);

          // 3. Salva no estado
          set({
            user: backendUser,
            firebaseUser: firebaseResult.user,
            firebaseToken: firebaseResult.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // 4. Salva no localStorage
          localStorage.setItem('firebaseToken', firebaseResult.token);
          localStorage.setItem('user', JSON.stringify(backendUser));
        } catch (error: any) {
          console.error('❌ [Login] Erro:', error);
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
          console.log('🔥 [Firebase] Iniciando registro...');
          
          // 1. Cria conta no Firebase
          const firebaseResult = await firebaseAuthService.register(email, password, name);
          
          if (!firebaseResult.success || !firebaseResult.token) {
            throw new Error(firebaseResult.error || 'Falha no registro Firebase');
          }

          console.log('✅ [Firebase] Registro bem sucedido');
          console.log('🔄 [Backend] Sincronizando usuário...');

          // 2. Sincroniza com backend
          const backendResponse = await axios.post(`${API_URL}/auth/firebase-login`, {
            firebaseToken: firebaseResult.token,
          });

          const backendUser = backendResponse.data.user;

          console.log('✅ [Backend] Usuário criado:', backendUser);

          // 3. Salva no estado
          set({
            user: backendUser,
            firebaseUser: firebaseResult.user,
            firebaseToken: firebaseResult.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // 4. Salva no localStorage
          localStorage.setItem('firebaseToken', firebaseResult.token);
          localStorage.setItem('user', JSON.stringify(backendUser));
        } catch (error: any) {
          console.error('❌ [Register] Erro:', error);
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
       * Realiza logout
       */
      logout: async () => {
        try {
          await firebaseAuthService.logout();
        } catch (error) {
          console.error('❌ [Logout] Erro:', error);
        } finally {
          // Limpa tudo
          localStorage.removeItem('firebaseToken');
          localStorage.removeItem('user');
          
          set({
            user: null,
            firebaseUser: null,
            firebaseToken: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      /**
       * Carrega usuário do Firebase e valida com backend
       */
      loadUser: async () => {
        const token = localStorage.getItem('firebaseToken');
        
        if (!token) {
          console.log('⚠️ [loadUser] Sem token Firebase');
          set({ user: null, isAuthenticated: false });
          return;
        }

        console.log('🔄 [loadUser] Validando token Firebase...');
        set({ isLoading: true });

        try {
          // Tenta sincronizar com backend
          const response = await axios.post(`${API_URL}/auth/firebase-login`, {
            firebaseToken: token,
          });

          const backendUser = response.data.user;
          const firebaseUser = firebaseAuthService.getCurrentUser();

          console.log('✅ [loadUser] Token válido, usuário carregado');

          set({
            user: backendUser,
            firebaseUser,
            firebaseToken: token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          console.error('❌ [loadUser] Token inválido ou expirado');
          
          // Token inválido - limpa tudo
          localStorage.removeItem('firebaseToken');
          localStorage.removeItem('user');
          
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
          console.log('🔄 [Auth] Zustand hidratado:', {
            hasUser: !!state.user,
            hasToken: !!state.firebaseToken,
            isAuthenticated: state.isAuthenticated,
          });
        }
      },
    }
  )
);