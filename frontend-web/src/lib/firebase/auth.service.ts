import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User as FirebaseUser,
  UserCredential,
  getIdToken,
} from 'firebase/auth';
import { auth } from './config';

// Tipos
export interface FirebaseAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: FirebaseAuthUser;
  token?: string;
  error?: string;
}

// Provider para login com Google
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Converte FirebaseUser para nosso tipo
 */
const mapFirebaseUser = (user: FirebaseUser): FirebaseAuthUser => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  photoURL: user.photoURL,
  emailVerified: user.emailVerified,
});

/**
 * Serviço de autenticação Firebase
 */
export const firebaseAuthService = {
  /**
   * Registrar novo usuário com email e senha
   */
  async register(email: string, password: string, name: string): Promise<AuthResult> {
    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Atualizar o nome do usuário
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name });
      }
      
      // Enviar email de verificação
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
      }
      
      // Obter token para enviar ao backend
      const token = await getIdToken(userCredential.user);
      
      return {
        success: true,
        user: mapFirebaseUser(userCredential.user),
        token,
      };
    } catch (error: any) {
      console.error('Firebase register error:', error);
      return {
        success: false,
        error: getFirebaseErrorMessage(error.code),
      };
    }
  },

  /**
   * Login com email e senha
   */
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await getIdToken(userCredential.user);
      
      return {
        success: true,
        user: mapFirebaseUser(userCredential.user),
        token,
      };
    } catch (error: any) {
      console.error('Firebase login error:', error);
      return {
        success: false,
        error: getFirebaseErrorMessage(error.code),
      };
    }
  },

  /**
   * Login com Google
   */
  async loginWithGoogle(): Promise<AuthResult> {
    try {
      const userCredential: UserCredential = await signInWithPopup(auth, googleProvider);
      const token = await getIdToken(userCredential.user);
      
      return {
        success: true,
        user: mapFirebaseUser(userCredential.user),
        token,
      };
    } catch (error: any) {
      console.error('Firebase Google login error:', error);
      return {
        success: false,
        error: getFirebaseErrorMessage(error.code),
      };
    }
  },

  /**
   * Logout
   */
  async logout(): Promise<AuthResult> {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error: any) {
      console.error('Firebase logout error:', error);
      return {
        success: false,
        error: getFirebaseErrorMessage(error.code),
      };
    }
  },

  /**
   * Enviar email de recuperação de senha
   */
  async sendPasswordReset(email: string): Promise<AuthResult> {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error: any) {
      console.error('Firebase password reset error:', error);
      return {
        success: false,
        error: getFirebaseErrorMessage(error.code),
      };
    }
  },

  /**
   * Reenviar email de verificação
   */
  async resendVerificationEmail(): Promise<AuthResult> {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        return { success: true };
      }
      return {
        success: false,
        error: 'Nenhum usuário logado',
      };
    } catch (error: any) {
      console.error('Firebase verification email error:', error);
      return {
        success: false,
        error: getFirebaseErrorMessage(error.code),
      };
    }
  },

  /**
   * Obter token atual do usuário
   */
  async getCurrentToken(): Promise<string | null> {
    try {
      if (auth.currentUser) {
        return await getIdToken(auth.currentUser, true); // force refresh
      }
      return null;
    } catch (error) {
      console.error('Error getting current token:', error);
      return null;
    }
  },

  /**
   * Obter usuário atual
   */
  getCurrentUser(): FirebaseAuthUser | null {
    if (auth.currentUser) {
      return mapFirebaseUser(auth.currentUser);
    }
    return null;
  },

  /**
   * Observer para mudanças de estado de autenticação
   */
  onAuthStateChange(callback: (user: FirebaseAuthUser | null) => void): () => void {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        callback(mapFirebaseUser(user));
      } else {
        callback(null);
      }
    });
  },

  /**
   * Verificar se o usuário está logado
   */
  isLoggedIn(): boolean {
    return auth.currentUser !== null;
  },
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
    'auth/popup-closed-by-user': 'O popup de login foi fechado antes de completar.',
    'auth/cancelled-popup-request': 'A operação foi cancelada.',
    'auth/popup-blocked': 'O popup foi bloqueado pelo navegador.',
    'auth/requires-recent-login': 'Esta operação requer login recente. Faça login novamente.',
  };

  return errorMessages[errorCode] || 'Ocorreu um erro. Tente novamente.';
}

export default firebaseAuthService;
