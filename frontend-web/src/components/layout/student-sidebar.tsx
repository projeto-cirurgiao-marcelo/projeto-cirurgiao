'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Award,
  ChevronDown,
  Library,
  LogOut,
  Menu,
  MessageSquare,
  PlayCircle,
  Sparkles,
  Trophy,
  User,
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
    label: 'Biblioteca',
    items: [
      {
        label: 'Meus cursos',
        href: '/student/my-courses',
        icon: Library,
      },
      {
        label: 'Explorar',
        href: '/student/courses',
        icon: PlayCircle,
        matchPrefix: '/student/courses',
      },
      {
        label: 'Em progresso',
        href: '/student/in-progress',
        icon: PlayCircle,
      },
      {
        label: 'Concluídos',
        href: '/student/completed',
        icon: Award,
      },
    ],
  },
  {
    label: 'Estudo',
    items: [
      {
        label: 'Biblioteca IA',
        href: '/student/library',
        icon: Sparkles,
      },
      {
        label: 'Fórum',
        href: '/student/forum',
        icon: MessageSquare,
      },
      {
        label: 'Conquistas',
        href: '/student/gamification',
        icon: Trophy,
      },
    ],
  },
];

function getInitials(name?: string | null): string {
  if (!name) return 'E';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || 'E';
}

function StudentRailFooter({ collapsed }: { collapsed: boolean }) {
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
            name={user?.name ?? 'Estudante'}
            role={user?.role === 'ADMIN' ? 'Administrador' : 'Estudante'}
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
        <DropdownMenuItem onClick={() => router.push('/student/profile')}>
          <User className="size-4 mr-2" strokeWidth={1.5} />
          Meu perfil
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
    <div
      className={cn(
        'hidden md:block fixed left-0 top-0 z-40 h-screen',
      )}
    >
      <AtlasRail
        brandHref="/student/my-courses"
        sections={SECTIONS}
        collapsed={isCollapsed}
        onToggle={toggleSidebar}
        footer={<StudentRailFooter collapsed={isCollapsed} />}
      />
    </div>
  );
}

// Rotas com header contextual próprio em mobile — burger button some pra dar lugar à mini-bar
const BURGER_HIDDEN_ON_MOBILE = /^\/student\/courses\/[^/]+\/watch\/[^/]+/;

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const burgerHiddenOnMobile = BURGER_HIDDEN_ON_MOBILE.test(pathname ?? '');

  // Fecha drawer automaticamente se rota mudou pra uma rota com burger escondido
  // (ex: usuário abriu drawer e clicou em link que vai pra watch route)
  useEffect(() => {
    if (burgerHiddenOnMobile) setOpen(false);
  }, [burgerHiddenOnMobile]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
        className={cn(
          'md:hidden fixed left-3 top-3 z-50 size-9 rounded-md border border-atlas-line bg-atlas-surface text-atlas-ink-2 flex items-center justify-center hover:border-atlas-ink-2 hover:text-atlas-ink transition-colors',
          burgerHiddenOnMobile && 'hidden',
        )}
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
          brandHref="/student/my-courses"
          sections={SECTIONS}
          collapsed={false}
          onToggle={() => setOpen(false)}
          onItemClick={() => setOpen(false)}
          footer={<StudentRailFooter collapsed={false} />}
        />
      </div>
    </>
  );
}

export function StudentSidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
}
