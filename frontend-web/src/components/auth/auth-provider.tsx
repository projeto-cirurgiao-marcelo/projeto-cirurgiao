'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { logger } from '@/lib/logger';

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
    logger.log('🔄 [AuthProvider] Estado:', { hasHydrated, hasInitialized, isAuthenticated, hasUser: !!user });
    
    // Aguarda a hidratação do Zustand antes de validar
    if (hasHydrated && !hasInitialized) {
      // Se acabou de fazer login (menos de 5 segundos), não valida novamente
      const now = Date.now();
      const timeSinceLastCheck = now - lastAuthCheckRef.current;
      
      if (isAuthenticated && user && timeSinceLastCheck < 5000) {
        logger.log('✅ [AuthProvider] Login recente detectado, pulando validação');
        setHasInitialized(true);
        return;
      }
      
      logger.log('✅ [AuthProvider] Hidratação completa, iniciando loadUser()');
      lastAuthCheckRef.current = now;
      loadUser();
      setHasInitialized(true);
    }
  }, [hasHydrated, hasInitialized, isAuthenticated, user, loadUser]);

  // Atualiza timestamp e cookie de sessão quando estado de auth muda
  useEffect(() => {
    if (isAuthenticated && user) {
      lastAuthCheckRef.current = Date.now();
      // Setar cookie para o middleware SSR poder verificar
      document.cookie = `auth-session=${JSON.stringify({ role: user.role })}; path=/; max-age=86400; SameSite=Lax`;
    } else if (hasHydrated && !isAuthenticated) {
      // Limpar cookie quando deslogado
      document.cookie = 'auth-session=; path=/; max-age=0';
    }
  }, [isAuthenticated, user, hasHydrated]);

  return <>{children}</>;
}
