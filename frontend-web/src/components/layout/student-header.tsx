'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  AtlasAdminStrip,
  AtlasTopBar,
} from '@/components/atlas';
import { useSidebarStore } from '@/lib/stores/sidebar-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { NotificationCenter } from '@/components/layout/notification-center';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { cn } from '@/lib/utils';

/**
 * Rotas que possuem header contextual próprio em mobile (escondem topbar global em < md).
 * Ex: /student/courses/[id]/watch/[videoId] usa AtlasLessonHeader compact.
 */
const MOBILE_HIDDEN_PATTERNS = [/^\/student\/courses\/[^/]+\/watch\/[^/]+/];

function shouldHideOnMobile(pathname: string | null): boolean {
  if (!pathname) return false;
  return MOBILE_HIDDEN_PATTERNS.some((re) => re.test(pathname));
}

export function StudentHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { isCollapsed } = useSidebarStore();
  const { isAdminViewingAsStudent, exitStudentView } = useViewModeStore();
  const [searchValue, setSearchValue] = useState('');

  const hiddenOnMobile = shouldHideOnMobile(pathname);

  const handleBackToAdmin = () => {
    exitStudentView();
    router.push('/admin');
  };

  const offsetClass = isCollapsed
    ? 'left-0 md:left-20'
    : 'left-0 md:left-60';

  return (
    <>
      {isAdminViewingAsStudent && (
        <div
          className={cn(
            'fixed top-0 right-0 z-40 transition-[left] duration-300',
            offsetClass,
          )}
        >
          <AtlasAdminStrip onBack={handleBackToAdmin} />
        </div>
      )}

      <header
        className={cn(
          'fixed right-0 z-30 transition-[top,left] duration-300',
          offsetClass,
          isAdminViewingAsStudent ? 'top-10' : 'top-0',
          // Em rotas como /watch/[videoId], topbar global some em < md (header contextual assume)
          hiddenOnMobile && 'hidden md:block',
        )}
      >
        <AtlasTopBar
          breadcrumbs={[]}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onSearchSubmit={(v) => {
            const q = v.trim();
            if (q) router.push(`/student/search?q=${encodeURIComponent(q)}`);
          }}
          searchPlaceholder="Buscar cursos, aulas..."
          trailing={
            <>
              <ThemeToggle />
              <NotificationCenter />
            </>
          }
        />
      </header>
    </>
  );
}
