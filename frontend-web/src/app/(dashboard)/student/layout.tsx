'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { StudentSidebar } from '@/components/layout/student-sidebar';
import { StudentHeader } from '@/components/layout/student-header';
import { Loader2 } from 'lucide-react';

/**
 * Layout compartilhado para todas as páginas de estudante
 * Inclui sidebar e header automaticamente
 */
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated, isLoading } = useAuthStore();

  useEffect(() => {
    // Aguarda a hidratação e o carregamento antes de verificar autenticação
    if (hasHydrated && !isLoading && !isAuthenticated) {
      console.log('🔴 [Student Layout] Usuário não autenticado, redirecionando para login');
      router.push('/login');
    }
    
    // Verificar se é estudante (ou permitir ADMIN também para testes)
    if (hasHydrated && !isLoading && isAuthenticated && user?.role === 'INSTRUCTOR') {
      console.log('🔴 [Student Layout] Usuário é instrutor, redirecionando');
      router.push('/admin');
    }
  }, [hasHydrated, isLoading, isAuthenticated, user, router]);

  // Aguarda hidratação e carregamento antes de renderizar
  if (!hasHydrated || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[rgb(var(--primary-500))] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado após hidratação, não renderiza nada (o useEffect vai redirecionar)
  if (!isAuthenticated || !user) {
    return null;
  }

  // Permitir ADMIN e STUDENT acessarem a área de estudante
  if (user.role !== 'STUDENT' && user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StudentSidebar />
      <StudentHeader />
      
      {/* Main Content Area - com margin para sidebar e header */}
      {/* Mobile: sem margem esquerda, padding menor */}
      {/* Desktop: margem esquerda para sidebar, padding maior */}
      <main className="ml-0 md:ml-60 mt-16 p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
