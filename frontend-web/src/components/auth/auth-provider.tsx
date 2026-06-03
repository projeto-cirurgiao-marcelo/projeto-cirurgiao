'use client';

import { useEffect, useState, useRef } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { useAuthStore, isRememberedSession } from '@/lib/stores/auth-store';
import { auth } from '@/lib/firebase/config';
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
      // Setar cookie para o middleware SSR poder verificar.
      // Respeita "Lembrar de mim": sessão efêmera → cookie de sessão (sem max-age).
      const maxAge = isRememberedSession() ? '; max-age=86400' : '';
      document.cookie = `auth-session=${JSON.stringify({ role: user.role })}; path=/${maxAge}; SameSite=Lax`;
    } else if (hasHydrated && !isAuthenticated) {
      // Limpar cookie quando deslogado
      document.cookie = 'auth-session=; path=/; max-age=0';
    }
  }, [isAuthenticated, user, hasHydrated]);

  // Mantem o firebaseToken no zustand sincronizado com refreshes automaticos
  // do SDK Firebase. ID tokens expiram em 1h; o SDK faz refresh interno ~10min
  // antes da expiracao e dispara onIdTokenChanged. Sem este listener, o token
  // no zustand fica stale e a primeira chamada apos 1h vira 401.
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) return;
      try {
        const token = await firebaseUser.getIdToken();
        useAuthStore.setState({ firebaseToken: token });
      } catch (err) {
        logger.error('❌ [Auth] Falha ao sincronizar token refrescado:', err);
      }
    });
    return unsubscribe;
  }, []);

  return <>{children}</>;
}
