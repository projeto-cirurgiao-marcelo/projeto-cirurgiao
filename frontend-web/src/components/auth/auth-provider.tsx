'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Provider de autenticação que aguarda a hidratação antes de validar o usuário
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const loadUser = useAuthStore((state) => state.loadUser);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    console.log('🔄 [AuthProvider] Estado:', { hasHydrated, hasInitialized });
    
    // Aguarda a hidratação do Zustand antes de validar
    if (hasHydrated && !hasInitialized) {
      console.log('✅ [AuthProvider] Hidratação completa, iniciando loadUser()');
      loadUser();
      setHasInitialized(true);
    }
  }, [hasHydrated, hasInitialized, loadUser]);

  return <>{children}</>;
}
