import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, type User } from '../api/auth';
import type { LoginFormData, RegisterFormData } from '../schemas/auth-schemas';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hasHydrated: boolean;
}

interface AuthActions {
  login: (data: LoginFormData) => Promise<void>;
  register: (data: Omit<RegisterFormData, 'confirmPassword'>) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

type AuthStore = AuthState & AuthActions;

/**
 * Store de autenticação usando Zustand
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hasHydrated: false,

      /**
       * Realiza login do usuário
       */
      login: async (data: LoginFormData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.login(data);
          
          // Salva tokens no localStorage
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Erro ao fazer login';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      /**
       * Registra novo usuário
       */
      register: async (data: Omit<RegisterFormData, 'confirmPassword'>) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.register(data);
          
          // Salva tokens no localStorage
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Erro ao registrar usuário';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      /**
       * Realiza logout do usuário
       */
      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.error('Erro ao fazer logout:', error);
        } finally {
          // Limpa tokens do localStorage
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      /**
       * Carrega dados do usuário autenticado
       */
  loadUser: async () => {
    // Modo de desenvolvimento: desabilitar autenticação
    const disableAuth = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';
    
    if (disableAuth) {
      console.log('🔓 [loadUser] Modo DEV: Autenticação desabilitada');
      const mockUser: User = {
        id: 'dev-user-id',
        email: 'dev@localhost',
        name: 'Dev User',
        role: 'ADMIN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set({ 
        user: mockUser, 
        isAuthenticated: true,
        accessToken: 'dev-token',
        refreshToken: 'dev-refresh-token',
      });
      localStorage.setItem('accessToken', 'dev-token');
      localStorage.setItem('refreshToken', 'dev-refresh-token');
      localStorage.setItem('user', JSON.stringify(mockUser));
      return;
    }

    const accessToken = localStorage.getItem('accessToken');
    console.log('📥 [loadUser] Token do localStorage:', accessToken ? 'Presente' : 'Ausente');

    if (!accessToken) {
      console.log('❌ [loadUser] Sem token, removendo usuário');
      set({ user: null, isAuthenticated: false });
      return;
    }

        console.log('✅ [Auth] Token encontrado, validando com API...');
        set({ isLoading: true });

        try {
          const user = await authService.getProfile();
          console.log('✅ [Auth] Usuário validado com sucesso:', user.email);
          
          set({
            user,
            accessToken: accessToken,
            refreshToken: localStorage.getItem('refreshToken'),
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          console.error('❌ [Auth] Erro ao validar usuário:', error);
          
          // Apenas limpa autenticação se for erro 401 (token inválido)
          const isUnauthorized = error.response?.status === 401;
          
          if (isUnauthorized) {
            // Token inválido/expirado - fazer logout
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
              error: 'Sessão expirada. Faça login novamente.',
            });
          } else {
            // Erro de rede ou servidor - mantém dados locais
            // Usuário pode continuar usando o app com dados em cache
            const cachedUser = get().user;
            
            set({
              isLoading: false,
              error: 'Não foi possível validar a sessão. Continuando offline.',
              // Mantém dados existentes
              user: cachedUser,
              accessToken,
              refreshToken: localStorage.getItem('refreshToken'),
              isAuthenticated: !!cachedUser, // Só marca como autenticado se tiver usuário em cache
            });
          }
        }
      },

      /**
       * Limpa mensagem de erro
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Define tokens de autenticação
       */
      setTokens: (accessToken: string, refreshToken: string) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        set({
          accessToken,
          refreshToken,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
          console.log('🔄 [Auth] Zustand hidratado:', {
            hasUser: !!state.user,
            hasToken: !!state.accessToken,
            isAuthenticated: state.isAuthenticated,
          });
        }
      },
    }
  )
);
