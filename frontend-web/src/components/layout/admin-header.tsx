'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  AtlasIconButton,
  AtlasTopBar,
} from '@/components/atlas';
import { useSidebarStore } from '@/lib/stores/sidebar-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { NotificationCenter } from '@/components/layout/notification-center';
import { cn } from '@/lib/utils';

export function AdminHeader() {
  const router = useRouter();
  const { isCollapsed } = useSidebarStore();
  const { enterStudentView } = useViewModeStore();
  const [searchValue, setSearchValue] = useState('');

  const handleViewAsStudent = () => {
    enterStudentView();
    router.push('/student/courses');
  };

  const offsetClass = isCollapsed
    ? 'left-0 md:left-20'
    : 'left-0 md:left-60';

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-30 transition-[left] duration-300',
        offsetClass,
      )}
    >
      <AtlasTopBar
        breadcrumbs={[]}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Buscar cursos, alunos, vídeos..."
        trailing={
          <>
            <AtlasIconButton
              ariaLabel="Visão estudante"
              onClick={handleViewAsStudent}
              className="text-atlas-muted hover:text-atlas-primary-2"
            >
              <Eye strokeWidth={1.5} />
            </AtlasIconButton>
            <NotificationCenter />
          </>
        }
      />
    </header>
  );
}
