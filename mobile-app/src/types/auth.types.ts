/**
 * Tipos relacionados a Autenticação - Migrado do frontend-web
 */

export type UserRole = 'STUDENT' | 'ADMIN' | 'INSTRUCTOR';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  onboardingCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FirebaseAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export interface AuthState {
  user: User | null;
  firebaseUser: FirebaseAuthUser | null;
  firebaseToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hasHydrated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}