'use client';

import { useState } from 'react';
import { Search, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSidebarStore } from '@/lib/stores/sidebar-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { NotificationCenter } from '@/components/layout/notification-center';
import { useRouter } from 'next/navigation';
export function AdminHeader() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { isCollapsed } = useSidebarStore();
  const { enterStudentView } = useViewModeStore();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const handleViewAsStudent = () => {
    enterStudentView();
    router.push('/student/courses');
  };

  return (
    <header
      className={`fixed right-0 top-0 z-30 h-16 border-b border-[rgb(var(--border))] bg-white dark:bg-gray-900 transition-all duration-300 ${
        isCollapsed ? 'left-0 md:left-16' : 'left-0 md:left-60'
      }`}
    >
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Espaço para o botão hambúrguer em mobile */}
        <div className="w-12 md:hidden" />

        {/* Search Bar */}
        <div className="relative hidden sm:block w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Buscar cursos, alunos, vídeos..."
            className="pl-10 bg-gray-50 dark:bg-gray-800 border-none"
          />
        </div>

        {/* Título em mobile */}
        <div className="sm:hidden flex-1 text-center">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Admin
          </span>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" className="sm:hidden">
            <Search className="h-5 w-5" />
          </Button>

          {/* View as Student */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex gap-1.5 text-gray-600 hover:text-blue-600"
            onClick={handleViewAsStudent}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden md:inline">Visão Estudante</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={handleViewAsStudent}
            title="Visão Estudante"
          >
            <Eye className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <NotificationCenter />

          {/* User Menu */}
          <DropdownMenu modal={false} open={profileOpen} onOpenChange={setProfileOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <div
                  className="transition-transform duration-200"
                  style={{ transform: profileOpen ? 'scale(1.1)' : 'scale(1)' }}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[rgb(var(--primary-500))] text-white text-xs">
                      {user?.name?.charAt(0).toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-sm font-medium hidden lg:block">
                  {user?.name || 'Admin'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <span className="text-sm truncate">{user?.email}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
