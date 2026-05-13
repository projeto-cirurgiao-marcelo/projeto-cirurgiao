'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  ChevronDown,
  Folders,
  HardDrive,
  Home,
  ListChecks,
  LogOut,
  Menu,
  Settings,
  User,
  Users,
  Video,
  X,
} from 'lucide-react';
import {
  AtlasRail,
  AtlasRailUser,
  type RailSection,
} from '@/components/atlas';
import { useSidebarStore } from '@/lib/stores/sidebar-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useAvatarStore } from '@/lib/stores/avatar-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const SECTIONS: RailSection[] = [
  {
    label: 'Operação',
    items: [
      { label: 'Dashboard', href: '/admin', icon: Home, matchExact: true },
      { label: 'Cursos', href: '/admin/courses', icon: BookOpen },
      { label: 'Módulos', href: '/admin/modules', icon: Folders },
      { label: 'Vídeos', href: '/admin/videos', icon: Video },
      { label: 'R2 Browser', href: '/admin/r2-browser', icon: HardDrive },
      { label: 'Catálogo de Vídeos', href: '/admin/media', icon: Folders },
      { label: 'Jobs', href: '/admin/jobs', icon: ListChecks },
    ],
  },
  {
    label: 'Pessoas',
    items: [{ label: 'Alunos', href: '/admin/students', icon: Users }],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Configurações', href: '/admin/settings', icon: Settings },
    ],
  },
];

function getInitials(name?: string | null): string {
  if (!name) return 'A';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || 'A';
}

function AdminRailFooter({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const photoUrl = useAvatarStore((s) => s.photoUrl);
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div>
          <AtlasRailUser
            initials={getInitials(user?.name)}
            name={user?.name ?? 'Admin'}
            role="Administrador"
            photoUrl={photoUrl ?? undefined}
            collapsed={collapsed}
            trailing={
              <ChevronDown
                className="size-3.5 text-atlas-muted shrink-0"
                strokeWidth={1.5}
              />
            }
          />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <span className="text-xs truncate">{user?.email}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/admin/settings')}>
          <Settings className="size-4 mr-2" strokeWidth={1.5} />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-atlas-accent"
        >
          <LogOut className="size-4 mr-2" strokeWidth={1.5} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DesktopSidebar() {
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  return (
    <div className="hidden md:block fixed left-0 top-0 z-40 h-screen">
      <AtlasRail
        brandHref="/admin"
        sections={SECTIONS}
        collapsed={isCollapsed}
        onToggle={toggleSidebar}
        footer={<AdminRailFooter collapsed={isCollapsed} />}
      />
    </div>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
        className="md:hidden fixed left-3 top-3 z-50 size-9 rounded-md border border-atlas-line bg-atlas-surface text-atlas-ink-2 flex items-center justify-center hover:border-atlas-ink-2 hover:text-atlas-ink transition-colors"
      >
        <span className="relative size-5 inline-block">
          <Menu
            className={cn(
              'absolute inset-0 size-5 transition-all duration-200',
              open
                ? 'opacity-0 rotate-90 scale-75'
                : 'opacity-100 rotate-0 scale-100',
            )}
            strokeWidth={1.75}
          />
          <X
            className={cn(
              'absolute inset-0 size-5 transition-all duration-200',
              open
                ? 'opacity-100 rotate-0 scale-100'
                : 'opacity-0 -rotate-90 scale-75',
            )}
            strokeWidth={1.75}
          />
        </span>
      </button>

      <div
        className={cn(
          'fixed inset-0 z-40 md:hidden',
          'bg-black/50 backdrop-blur-[2px]',
          'transition-opacity duration-300 ease-[cubic-bezier(.2,.7,.2,1)]',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 md:hidden flex',
          'transition-transform duration-300 ease-[cubic-bezier(.2,.7,.2,1)]',
          'will-change-transform',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-hidden={!open}
      >
        <AtlasRail
          brandHref="/admin"
          sections={SECTIONS}
          collapsed={false}
          onToggle={() => setOpen(false)}
          onItemClick={() => setOpen(false)}
          footer={<AdminRailFooter collapsed={false} />}
        />
      </div>
    </>
  );
}

export function AdminSidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
}
