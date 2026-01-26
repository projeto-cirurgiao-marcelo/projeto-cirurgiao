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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

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
  // TODO: Implementar rotas adicionais
  // Veja MAPEAMENTO_ROTAS_ESTUDANTE_15-01-2026.md para detalhes
  
  // {
  //   title: 'Histórico',
  //   href: '/student/history',
  //   icon: Clock,
  // },
  // {
  //   title: 'Meu Perfil',
  //   href: '/student/profile',
  //   icon: User,
  // },
  // {
  //   title: 'Configurações',
  //   href: '/student/settings',
  //   icon: Settings,
  // },
];

// Componente de navegação reutilizável
function SidebarNav({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 p-4">
      {navItems.map((item, index) => {
        const Icon = item.icon;
        // Lógica mais precisa: exato match OU começa com o href + '/' (para sub-rotas)
        const isActive = pathname === item.href || 
          (pathname.startsWith(item.href + '/') && 
           // Evitar ativar /student/courses quando estiver em /student/courses/[id]
           !(item.href === '/student/courses' && pathname.includes('/student/courses/')));

        return (
          <Link
            key={`${item.href}-${index}`}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200',
              isActive
                ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-l-4 border-blue-600 shadow-sm'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
            )}
          >
            <Icon
              className={cn(
                'h-5 w-5',
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// Logo reutilizável
function SidebarLogo() {
  return (
    <Link href="/student/my-courses" className="flex items-center gap-2 transition-opacity hover:opacity-80">
      <img 
        src="/logoblack.webp" 
        alt="Cirurgião Academy" 
        className="h-10 w-auto object-contain"
      />
    </Link>
  );
}

// Sidebar Mobile (Sheet/Drawer)
export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed left-4 top-4 z-50 bg-white dark:bg-gray-900 shadow-md border border-gray-200 dark:border-gray-700"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0">
        <SheetHeader className="h-16 flex items-center border-b-2 border-gray-200 px-6">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SidebarLogo />
        </SheetHeader>
        <SidebarNav onItemClick={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

// Sidebar Desktop (Fixa)
export function DesktopSidebar() {
  return (
    <aside className="hidden md:block fixed left-0 top-0 z-40 h-screen w-60 border-r-2 border-gray-200 bg-white dark:bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center border-b-2 border-gray-200 px-6">
        <SidebarLogo />
      </div>

      {/* Navigation */}
      <SidebarNav />
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
