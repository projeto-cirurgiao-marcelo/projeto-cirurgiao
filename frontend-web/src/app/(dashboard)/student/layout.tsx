'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSidebarStore } from '@/lib/stores/sidebar-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { StudentSidebar } from '@/components/layout/student-sidebar';
import { StudentHeader } from '@/components/layout/student-header';
import { GamificationProvider } from '@/components/gamification/GamificationProvider';
import { Loader2, Eye, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const { isCollapsed } = useSidebarStore();
  const { isStudentView, setStudentView } = useViewModeStore();
  const isAdminViewing = user?.role === 'ADMIN' && isStudentView;

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
    <GamificationProvider>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StudentSidebar />
      <StudentHeader />
      
      {/* Banner de Visao Estudante para Admin */}
      {isAdminViewing && (
        <div className={cn(
          "fixed top-16 right-0 z-20 transition-all duration-300",
          "left-0",
          isCollapsed ? "md:left-20" : "md:left-60"
        )}>
          <div className="flex items-center justify-between px-4 py-2 bg-amber-50 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Voce esta visualizando como Estudante
              </span>
            </div>
            <button
              onClick={() => {
                setStudentView(false);
                router.push('/admin');
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Voltar ao Admin
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={cn(
        "p-4 md:p-6 lg:p-8 transition-all duration-300",
        isAdminViewing ? "mt-[104px]" : "mt-16",
        "ml-0",
        isCollapsed ? "md:ml-20" : "md:ml-60"
      )}>
        {children}
      </main>
    </div>
    </GamificationProvider>
  );
}
