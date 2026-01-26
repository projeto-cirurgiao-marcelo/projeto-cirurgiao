'use client';

import { Search, Bell, Menu } from 'lucide-react';
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
import { useRouter } from 'next/navigation';

export function StudentHeader() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="fixed left-0 md:left-60 right-0 top-0 z-30 h-16 border-b border-[rgb(var(--border))] bg-white dark:bg-gray-900">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Espaço para o botão hamburguer em mobile */}
        <div className="w-12 md:hidden" />
        
        {/* Search Bar - oculto em mobile pequeno, visível em sm+ */}
        <div className="relative hidden sm:block w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Buscar cursos, aulas..."
            className="pl-10 bg-gray-50 dark:bg-gray-800 border-none"
          />
        </div>

        {/* Título em mobile quando search está oculto */}
        <div className="sm:hidden flex-1 text-center">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Meus Cursos
          </span>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Search button mobile */}
          <Button variant="ghost" size="icon" className="sm:hidden">
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[rgb(var(--destructive))]" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[rgb(var(--primary-500))] text-white text-xs">
                    {user?.name?.charAt(0).toUpperCase() || 'E'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden lg:block">
                  {user?.name || 'Estudante'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <span className="text-sm truncate">{user?.email}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/student/profile')}>
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/student/settings')}>
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
