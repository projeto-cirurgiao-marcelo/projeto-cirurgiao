'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Provider de autenticação que aguarda a hidratação antes de validar o usuário
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const loadUser = useAuthStore((state) => state.loadUser);
  const [hasInitialized, setHasInitialized] = useState(false);
  const lastAuthCheckRef = useRef<number>(0);

  useEffect(() => {
    console.log('🔄 [AuthProvider] Estado:', { hasHydrated, hasInitialized, isAuthenticated, hasUser: !!user });
    
    // Aguarda a hidratação do Zustand antes de validar
    if (hasHydrated && !hasInitialized) {
      // Se acabou de fazer login (menos de 5 segundos), não valida novamente
      const now = Date.now();
      const timeSinceLastCheck = now - lastAuthCheckRef.current;
      
      if (isAuthenticated && user && timeSinceLastCheck < 5000) {
        console.log('✅ [AuthProvider] Login recente detectado, pulando validação');
        setHasInitialized(true);
        return;
      }
      
      console.log('✅ [AuthProvider] Hidratação completa, iniciando loadUser()');
      lastAuthCheckRef.current = now;
      loadUser();
      setHasInitialized(true);
    }
  }, [hasHydrated, hasInitialized, isAuthenticated, user, loadUser]);

  // Atualiza timestamp quando usuário faz login
  useEffect(() => {
    if (isAuthenticated && user) {
      lastAuthCheckRef.current = Date.now();
    }
  }, [isAuthenticated, user]);

  return <>{children}</>;
}
