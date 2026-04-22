'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSidebarStore } from '@/lib/stores/sidebar-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { useAvatarStore } from '@/lib/stores/avatar-store';
import { profileService } from '@/lib/api/profile.service';
import { StudentSidebar } from '@/components/layout/student-sidebar';
import { StudentHeader } from '@/components/layout/student-header';
import { GamificationProvider } from '@/components/gamification/GamificationProvider';
import { ChatWidget } from '@/components/chatbot/chat-widget';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { logger } from '@/lib/logger';

/**
 * Layout compartilhado para todas as paginas de estudante
 * Inclui sidebar, header e GamificationProvider automaticamente
 */
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { isCollapsed } = useSidebarStore();
  const { isAdminViewingAsStudent } = useViewModeStore();
  const setPhotoUrl = useAvatarStore((s) => s.setPhotoUrl);

  // Carregar foto do perfil uma vez ao montar
  useEffect(() => {
    if (isAuthenticated && user) {
      profileService.getProfile()
        .then(profile => setPhotoUrl(profile.photoUrl))
        .catch(() => {});
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (hasHydrated && !isLoading && !isAuthenticated) {
      logger.log('[Student Layout] Usuario nao autenticado, redirecionando para login');
      router.push('/login');
    }

    if (hasHydrated && !isLoading && isAuthenticated && user?.role === 'INSTRUCTOR') {
      logger.log('[Student Layout] Usuario e instrutor, redirecionando');
      router.push('/admin');
    }
  }, [hasHydrated, isLoading, isAuthenticated, user, router]);

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

  if (!isAuthenticated || !user) {
    return null;
  }

  if (user.role !== 'STUDENT' && user.role !== 'ADMIN') {
    return null;
  }

  return (
    <GamificationProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <StudentSidebar />
        <StudentHeader />

        {/* Main Content Area */}
        <main
          className={cn(
            'p-4 md:p-6 lg:p-8 transition-all duration-300',
            'ml-0',
            isCollapsed ? 'md:ml-20' : 'md:ml-60',
            isAdminViewingAsStudent ? 'mt-[104px]' : 'mt-16',
          )}
        >
          {children}
        </main>

        {/* Chatbot IA flutuante */}
        <ChatWidget />
      </div>
    </GamificationProvider>
  );
}
