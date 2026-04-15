/**
 * Store de Autenticação com Zustand - Alinhado com frontend-web
 * Usa AsyncStorage para persistência no React Native
 *
 * Fluxo de login:
 * 1. Firebase signIn → obtém token
 * 2. POST /auth/firebase-login { firebaseToken } → backend valida e retorna user com role
 * 3. Salva token + user no estado e AsyncStorage
 *
 * Fluxo de registro:
 * 1. POST /aulas/92339018203 { email, password, name } → backend cria no Firebase Auth + PostgreSQL
 * 2. Firebase signIn → obtém token
 * 3. POST /auth/firebase-login → sincroniza e obtém user com role
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signInWithEmailAndPassword,
  signOut,
  getIdToken,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { User, AuthState, LoginCredentials, RegisterCredentials } from '../types';
import { apiClient } from '../services/api/client';

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setFirebaseToken: (token: string) => void;
  setUser: (user: User) => void;
  clearError: () => void;
  setHasHydrated: (state: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

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
        set({ isLoading: true, error: null });
        try {
          // 1. Login no Firebase
          const userCredential = await signInWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
          );
          const token = await userCredential.user.getIdToken();
          await AsyncStorage.setItem('firebaseToken', token);

          // 2. Sincroniza com backend (mesmo endpoint do web)
          const backendResponse = await apiClient.post('/auth/firebase-login', {
            firebaseToken: token,
          });

          const backendUser: User = backendResponse.data.user;

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
            firebaseToken: token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          console.error('Erro no login:', error);

          let message = 'Erro ao fazer login';
          // Erro do Firebase (tem .code)
          if (error.code) {
            message = getFirebaseErrorMessage(error.code);
          }
          // Erro do backend (tem .response)
          else if (error.response?.data?.message) {
            message = error.response.data.message;
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
       * Register: POST /aulas/92339018203 (rota secreta) → cria no Firebase + PostgreSQL
       * Depois faz login normal via Firebase para obter token
       */
      register: async (credentials: RegisterCredentials) => {
        set({ isLoading: true, error: null });
        try {
          // 1. Cria usuário via rota secreta (backend cria no Firebase Auth + PostgreSQL)
          await apiClient.post('/aulas/92339018203', {
            email: credentials.email,
            password: credentials.password,
            name: credentials.name,
          });

          // 2. Faz login no Firebase client-side para obter token
          const userCredential = await signInWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
          );
          const token = await userCredential.user.getIdToken();
          await AsyncStorage.setItem('firebaseToken', token);

          // 3. Sincroniza com backend para obter dados do usuário com role
          const backendResponse = await apiClient.post('/auth/firebase-login', {
            firebaseToken: token,
          });

          const backendUser: User = backendResponse.data.user;

          // 4. Salva no estado
          set({
            user: backendUser,
            firebaseUser: {
              uid: userCredential.user.uid,
              email: userCredential.user.email,
              displayName: userCredential.user.displayName,
              photoURL: userCredential.user.photoURL,
              emailVerified: userCredential.user.emailVerified,
            },
            firebaseToken: token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          console.error('Erro no registro:', error);

          let message = 'Erro ao criar conta';
          if (error.code) {
            message = getFirebaseErrorMessage(error.code);
          } else if (error.response?.data?.message) {
            message = error.response.data.message;
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
      logout: async () => {
        try {
          await signOut(auth);
        } catch (error) {
          console.error('Erro ao fazer logout:', error);
        } finally {
          await AsyncStorage.removeItem('firebaseToken');
          set({
            ...initialState,
            hasHydrated: true,
          });
        }
      },

      /**
       * loadUser: Valida token existente com backend
       * Chamado na hidratação do app para restaurar sessão
       */
      loadUser: async () => {
        const token = get().firebaseToken;
        if (!token) {
          set({ hasHydrated: true });
          return;
        }

        set({ isLoading: true });
        try {
          // Valida token com o backend (mesmo endpoint do web)
          const response = await apiClient.post('/auth/firebase-login', {
            firebaseToken: token,
          });

          const backendUser: User = response.data.user;

          set({
            user: backendUser,
            isAuthenticated: true,
            isLoading: false,
            hasHydrated: true,
          });
        } catch (error) {
          // Token inválido ou expirado - tenta renovar via Firebase
          try {
            const currentUser = auth.currentUser;
            if (currentUser) {
              const newToken = await getIdToken(currentUser, true);
              await AsyncStorage.setItem('firebaseToken', newToken);

              const response = await apiClient.post('/auth/firebase-login', {
                firebaseToken: newToken,
              });

              const backendUser: User = response.data.user;

              set({
                user: backendUser,
                firebaseToken: newToken,
                isAuthenticated: true,
                isLoading: false,
                hasHydrated: true,
              });
              return;
            }
          } catch (refreshError) {
            // Refresh também falhou
          }

          // Limpa sessão
          await AsyncStorage.removeItem('firebaseToken');
          set({
            ...initialState,
            hasHydrated: true,
          });
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

      setFirebaseToken: (token: string) => {
        set({ firebaseToken: token });
        AsyncStorage.setItem('firebaseToken', token);
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
      partialize: (state) => ({
        user: state.user,
        firebaseToken: state.firebaseToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export default useAuthStore;
