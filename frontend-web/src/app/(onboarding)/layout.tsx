'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

/**
 * Layout do grupo (onboarding)/
 *
 * - Sem sidebar, sem header do dashboard.
 * - Gate de auth: usuarios nao-autenticados vao pro /login.
 * - Admin/Instrutor pulam onboarding (nao aplicavel ao fluxo academico).
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!hasHydrated || isLoading) return;
    if (!isAuthenticated) {
      logger.log('[Onboarding Layout] nao autenticado, redirect /login');
      router.push('/login');
      return;
    }
    if (user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR') {
      logger.log('[Onboarding Layout] admin/instrutor pula onboarding');
      router.push('/admin');
    }
  }, [hasHydrated, isLoading, isAuthenticated, user, router]);

  if (!hasHydrated || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
