import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
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
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const STORAGE_NAME = 'auth-storage-firebase';

/**
 * Storage dinâmico para o "Lembrar de mim":
 * - lembrar=true  → localStorage (sobrevive ao fechar o navegador)
 * - lembrar=false → sessionStorage (some ao fechar a aba/navegador)
 *
 * O storage ativo é decidido no login via setAuthPersistence(). Na carga inicial
 * (antes de qualquer login), detecta onde os dados já estão — sessionStorage tem
 * prioridade — para que escritas seguintes (ex.: refresh de token) fiquem no mesmo lugar.
 */
let activeStorage: Storage | null = null;

const resolveActiveStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  if (activeStorage) return activeStorage;
  activeStorage =
    window.sessionStorage.getItem(STORAGE_NAME) != null
      ? window.sessionStorage
      : window.localStorage;
  return activeStorage;
};

/** Define onde a sessão será persistida e migra o valor existente pro storage alvo. */
export const setAuthPersistence = (remember: boolean) => {
  if (typeof window === 'undefined') return;
  const target = remember ? window.localStorage : window.sessionStorage;
  const other = remember ? window.sessionStorage : window.localStorage;
  activeStorage = target;
  const existing = other.getItem(STORAGE_NAME) ?? target.getItem(STORAGE_NAME);
  if (existing != null) target.setItem(STORAGE_NAME, existing);
  other.removeItem(STORAGE_NAME);
};

/** true se a sessão atual deve ser lembrada (persistida em localStorage, não em sessionStorage). */
export const isRememberedSession = (): boolean => {
  if (typeof window === 'undefined') return true;
  // Se os dados estão na sessionStorage, é sessão efêmera ("não lembrar").
  return window.sessionStorage.getItem(STORAGE_NAME) == null;
};

const dynamicStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    // Lê de onde existir (sessão tem prioridade — fluxo "não lembrar").
    return window.sessionStorage.getItem(name) ?? window.localStorage.getItem(name);
  },
  setItem: (name, value) => {
    const storage = resolveActiveStorage();
    if (!storage) return;
    storage.setItem(name, value);
    const other = storage === window.localStorage ? window.sessionStorage : window.localStorage;
    other.removeItem(name); // evita duplicata stale no outro storage
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(name);
    window.sessionStorage.removeItem(name);
  },
};

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
      login: async (email: string, password: string, rememberMe: boolean = true) => {
        // Define o storage (local vs session) ANTES de qualquer escrita persistida.
        setAuthPersistence(rememberMe);
        set({ isLoading: true, error: null });

        try {
          logger.log('🔥 [Firebase] Iniciando login...');

          // 1. Login no Firebase (persistência conforme "Lembrar de mim")
          const firebaseResult = await firebaseAuthService.login(email, password, rememberMe);
          
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

          // 4. Seta o cookie sincronamente para que o middleware SSR já o enxergue
          // na navegação imediata (router.push) chamada pela página logo após este
          // await. O AuthProvider também seta o cookie num useEffect, mas esse roda
          // depois do render — tarde demais para o redirect.
          if (typeof document !== 'undefined') {
            // Lembrar → cookie com 1 dia de validade; não lembrar → cookie de sessão
            // (sem max-age, o navegador descarta ao fechar), alinhado à persistência.
            const maxAge = rememberMe ? '; max-age=86400' : '';
            document.cookie = `auth-session=${JSON.stringify({ role: backendUser.role })}; path=/${maxAge}; SameSite=Lax`;
          }
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

          // 4. Seta o cookie sincronamente — mesmo motivo da action login:
          // o register-form faz router.push imediatamente após este await.
          if (typeof document !== 'undefined') {
            document.cookie = `auth-session=${JSON.stringify({ role: backendUser.role })}; path=/; max-age=86400; SameSite=Lax`;
          }
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
      name: STORAGE_NAME,
      storage: createJSONStorage(() => dynamicStorage),
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
