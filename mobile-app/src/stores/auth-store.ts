/**
 * Store de Autenticação com Zustand - Alinhado com frontend-web
 * Usa AsyncStorage para persistência no React Native
 *
 * Fluxo de login:
 * 1. Firebase signIn → obtém token
 * 2. POST /auth/firebase-login { firebaseToken } → backend valida e retorna user com role
 * 3. Salva token no SecureStore e dados do usuario no AsyncStorage
 * Contas sao provisionadas por convite, nunca pelo cliente mobile.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { User, AuthState, LoginCredentials } from '../types';
import { apiClient, configureApiAuth, resetApiSession } from '../services/api/client';
import { logger } from '../lib/logger';

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
  setHasHydrated: (state: boolean) => void;
}

type AuthStore = AuthState & AuthActions;
let logoutPromise: Promise<void> | null = null;
let loginAttempt = 0;

const initialState: AuthState = {
  user: null,
  firebaseUser: null,
  firebaseToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  hasHydrated: false,
};

/**
 * Traduz erros do Firebase para mensagens amigáveis em português
 */
function getFirebaseErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'Este email já está sendo usado por outra conta.',
    'auth/invalid-email': 'O email informado é inválido.',
    'auth/operation-not-allowed': 'Operação não permitida. Entre em contato com o suporte.',
    'auth/weak-password': 'A senha é muito fraca. Use pelo menos 6 caracteres.',
    'auth/user-disabled': 'Esta conta foi desativada. Entre em contato com o suporte.',
    'auth/user-not-found': 'Não existe conta com este email.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-credential': 'Email ou senha incorretos.',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
    'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
  };

  return errorMessages[errorCode] || 'Ocorreu um erro. Tente novamente.';
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setHasHydrated: (state: boolean) => {
        set({ hasHydrated: state });
      },

      /**
       * Login: Firebase signIn → POST /auth/firebase-login → salva user + token
       */
      login: async (credentials: LoginCredentials) => {
        await get().logout();
        const attempt = ++loginAttempt;
        set({ isLoading: true, error: null });
        try {
          // 1. Login no Firebase
          const userCredential = await signInWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
          );
          // 2. Sincroniza com backend (mesmo endpoint do web)
          if (attempt !== loginAttempt) throw new Error('Login cancelado.');
          const backendResponse = await apiClient.post('/auth/firebase-login');

          const backendUser: User = backendResponse.data.user;
          if (attempt !== loginAttempt || auth.currentUser !== userCredential.user) {
            throw new Error('Login cancelado.');
          }

          // 3. Salva no estado
          set({
            user: backendUser,
            firebaseUser: {
              uid: userCredential.user.uid,
              email: userCredential.user.email,
              displayName: userCredential.user.displayName,
              photoURL: userCredential.user.photoURL,
              emailVerified: userCredential.user.emailVerified,
            },
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          // An old attempt must never clear a newer login or change its error state.
          if (attempt !== loginAttempt) throw new Error('Login cancelado.');
          await get().logout();

          let message = 'Erro ao fazer login';
          if (error.response?.data?.message) {
            message = error.response.data.message;
          } else if (error.code) {
            message = getFirebaseErrorMessage(error.code);
          }

          set({
            isLoading: false,
            error: message,
            user: null,
            firebaseUser: null,
            firebaseToken: null,
            isAuthenticated: false,
          });
          throw new Error(message);
        }
      },

      /**
       * Logout: Firebase signOut + limpa estado
       */
      logout: () => {
        if (logoutPromise) return logoutPromise;
        loginAttempt += 1;
        set({ ...initialState, hasHydrated: true });
        const clearedToken = resetApiSession();
        logoutPromise = (async () => {
          try {
            await signOut(auth);
          } catch {
            logger.warn('Nao foi possivel encerrar a sessao Firebase.');
          } finally {
            await clearedToken;
          }
        })().finally(() => { logoutPromise = null; });
        return logoutPromise;
      },

      /**
       * loadUser: Valida token existente com backend
       * Chamado na hidratação do app para restaurar sessão
       */
      loadUser: async () => {
        await auth.authStateReady();
        const currentUser = auth.currentUser;
        if (!currentUser) {
          await get().logout();
          return;
        }

        set({ isLoading: true });
        try {
          // The client obtains the current Firebase token and sets the body.
          const response = await apiClient.post('/auth/firebase-login');
          if (auth.currentUser !== currentUser) return;

          const backendUser: User = response.data.user;

          set({
            user: backendUser,
            firebaseUser: {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              emailVerified: currentUser.emailVerified,
            },
            isAuthenticated: true,
            isLoading: false,
            hasHydrated: true,
          });
        } catch (error: any) {
          if (auth.currentUser !== currentUser) return;
          if (error.response?.status === 401 || error.response?.status === 403) {
            await get().logout();
          } else {
            // Keep an existing session on offline/5xx; never authenticate a new one.
            set({ isLoading: false, hasHydrated: true, error: 'Nao foi possivel atualizar a sessao. Verifique sua conexao.' });
          }
        }
      },

      /**
       * Recuperação de senha via backend (POST /auth/forgot-password)
       * O backend usa Firebase Admin SDK para enviar o e-mail,
       * evitando problemas de domínio autorizado no client-side mobile.
       */
      resetPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          await apiClient.post('/auth/forgot-password', { email });
          set({ isLoading: false });
        } catch (error: any) {
          let message = 'Erro ao enviar e-mail de recuperação';
          if (error.response?.data?.message) {
            message = error.response.data.message;
          } else if (error.code) {
            message = getFirebaseErrorMessage(error.code);
          }
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },

      setUser: (user: User) => {
        set({ user });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // firebaseToken NÃO é persistido aqui (AsyncStorage não-criptografado).
      // O client sincroniza o token do Firebase com SecureStore e memoria.
      // So dados nao sensiveis ficam no AsyncStorage do Zustand.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

configureApiAuth({
  onTokenChanged: (firebaseToken) => useAuthStore.setState({ firebaseToken }),
  onSessionExpired: () => useAuthStore.getState().logout(),
});

export default useAuthStore;
