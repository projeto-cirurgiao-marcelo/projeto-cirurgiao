'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  BookOpen,
  PlayCircle,
  Award,
  User,
  Settings,
  GraduationCap,
  Menu,
  Library,
  Clock,
  MessageSquare,
  Trophy,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebarStore } from '@/lib/stores/sidebar-store';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    title: 'Meus Cursos',
    href: '/student/my-courses',
    icon: Home,
  },
  {
    title: 'Explorar Cursos',
    href: '/student/courses',
    icon: Library,
  },
  {
    title: 'Em Progresso',
    href: '/student/in-progress',
    icon: PlayCircle,
  },
  {
    title: 'Concluídos',
    href: '/student/completed',
    icon: Award,
  },
  {
    title: 'Fórum',
    href: '/student/forum',
    icon: MessageSquare,
  },
  {
    title: 'Conquistas',
    href: '/student/gamification',
    icon: Trophy,
  },
];

// Componente de navegação reutilizável
function SidebarNav({
  onItemClick,
  isCollapsed = false,
}: {
  onItemClick?: () => void;
  isCollapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 p-4">
      {navItems.map((item, index) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (pathname.startsWith(item.href + '/') &&
            !(
              item.href === '/student/courses' &&
              pathname.includes('/student/courses/')
            ));

        return (
          <Link
            key={`${item.href}-${index}`}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200',
              isActive
                ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-l-4 border-blue-600 shadow-sm'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
              isCollapsed && 'justify-center px-2',
            )}
            title={isCollapsed ? item.title : undefined}
          >
            <Icon
              className={cn(
                'h-5 w-5 flex-shrink-0',
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-500 dark:text-gray-400',
              )}
            />
            {!isCollapsed && <span>{item.title}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

// Logo reutilizável
function SidebarLogo({ isCollapsed = false }: { isCollapsed?: boolean }) {
  return (
    <Link
      href="/student/my-courses"
      className={cn(
        'flex items-center gap-2 transition-opacity hover:opacity-80',
        isCollapsed && 'justify-center',
      )}
    >
      {isCollapsed ? (
        <img
          src="/icone-logo.png"
          alt="Logo"
          className="h-8 w-8 object-contain"
        />
      ) : (
        <img
          src="/logoblack.webp"
          alt="Cirurgião Academy"
          className="h-10 w-auto object-contain"
        />
      )}
    </Link>
  );
}

// Sidebar Mobile (drawer com CSS transitions - sem framer-motion)
export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger / Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed left-4 top-4 z-50 bg-white dark:bg-gray-900 shadow-md border border-gray-200 dark:border-gray-700"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
      >
        <div
          className="transition-transform duration-200"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </div>
      </Button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-250 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 border-r-2 border-gray-200 bg-white dark:bg-gray-900 shadow-xl md:hidden flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header com logo icone */}
        <div className="flex h-16 items-center border-b-2 border-gray-200 px-4">
          <SidebarLogo isCollapsed />
        </div>

        {/* Navigation */}
        <SidebarNav onItemClick={() => setOpen(false)} />
      </aside>
    </>
  );
}

// Sidebar Desktop (Fixa com collapse)
export function DesktopSidebar() {
  const { isCollapsed, toggleSidebar } = useSidebarStore();

  return (
    <aside
      className={cn(
        'hidden md:block fixed left-0 top-0 z-40 h-screen border-r-2 border-gray-200 bg-white dark:bg-gray-900 transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b-2 border-gray-200 px-4">
        <SidebarLogo isCollapsed={isCollapsed} />

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(
            'h-8 w-8 rounded-full hover:bg-gray-100 transition-all',
            isCollapsed && 'mx-auto',
          )}
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <SidebarNav isCollapsed={isCollapsed} />
    </aside>
  );
}

// Componente principal que combina ambos
export function StudentSidebar() {
  return (
    <>
      {/* Sidebar Desktop - visível apenas em md+ */}
      <DesktopSidebar />

      {/* Sidebar Mobile - visível apenas em < md */}
      <MobileSidebar />
    </>
  );
}
