'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { CourseraHeader } from '@/components/layout/coursera-header';
import { Loader2 } from 'lucide-react';

/**
 * Layout da Plataforma (Estilo Coursera)
 *
 * Este layout é compartilhado por:
 * - Páginas do Admin (/admin/*)
 * - Páginas do Estudante (/student/*)
 *
 * Características:
 * - Header global sticky
 * - Navegação contextual por role
 * - Sem sidebar (layout fluido)
 * - Fundo branco/claro
 */
export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    // Aguarda a hidratação e o carregamento antes de verificar autenticação
    if (hasHydrated && !isLoading && !isAuthenticated) {
      console.log('🔴 [Platform Layout] Usuário não autenticado, redirecionando para login');
      router.push('/login');
    }
  }, [hasHydrated, isLoading, isAuthenticated, router]);

  // Aguarda hidratação e carregamento antes de renderizar
  if (!hasHydrated || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[rgb(var(--primary-500))] mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado após hidratação, não renderiza nada (o useEffect vai redirecionar)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg-primary))]">
      {/* Header Global Sticky */}
      <CourseraHeader />

      {/* Main Content - Full Width, sem sidebar */}
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>

      {/* Footer (opcional - adicionar depois) */}
      {/* <Footer /> */}
    </div>
  );
}
