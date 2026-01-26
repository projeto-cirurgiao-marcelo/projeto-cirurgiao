'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Settings,
  LogOut,
  Trophy,
  BookOpen,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

interface ProfileDropdownProps {
  mobile?: boolean;
}

export function ProfileDropdown({ mobile = false }: ProfileDropdownProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'ADMIN':
        return <Badge variant="default" className="text-xs">Admin</Badge>;
      case 'INSTRUCTOR':
        return <Badge variant="secondary" className="text-xs">Instrutor</Badge>;
      case 'STUDENT':
        return <Badge variant="outline" className="text-xs">Aluno</Badge>;
      default:
        return null;
    }
  };

  // Versão mobile (expanded)
  if (mobile) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
          <Avatar className="h-10 w-10">
            <AvatarImage src={undefined} alt={user?.name || ''} />
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-sm font-semibold">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.name || 'Usuário'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          {getRoleBadge()}
        </div>

        <div className="space-y-1">
          <Link href="/student/profile">
            <Button variant="ghost" className="w-full justify-start text-sm">
              <User className="h-4 w-4 mr-2" />
              Meu Perfil
            </Button>
          </Link>

          {user?.role === 'STUDENT' && (
            <Link href="/student/profile">
              <Button variant="ghost" className="w-full justify-start text-sm">
                <Trophy className="h-4 w-4 mr-2" />
                Conquistas
              </Button>
            </Link>
          )}

          {(user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR') && (
            <Link href="/admin/analytics">
              <Button variant="ghost" className="w-full justify-start text-sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Análises
              </Button>
            </Link>
          )}

          <Link href="/settings">
            <Button variant="ghost" className="w-full justify-start text-sm">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </Link>
        </div>

        <DropdownMenuSeparator />

        <Button
          variant="ghost"
          className="w-full justify-start text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    );
  }

  // Versão desktop (dropdown)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={undefined} alt={user?.name || ''} />
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs font-semibold">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-gray-900 hidden xl:block">
            {user?.name?.split(' ')[0] || 'Usuário'}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[280px] p-0">
        {/* Header do Dropdown */}
        <div className="px-4 py-3 border-b bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
              <AvatarImage src={undefined} alt={user?.name || ''} />
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.name || 'Usuário'}
                </p>
                {getRoleBadge()}
              </div>
              <p className="text-xs text-gray-600 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          <Link href="/student/profile" onClick={() => setOpen(false)}>
            <DropdownMenuItem className="cursor-pointer px-4 py-2">
              <User className="h-4 w-4 mr-3 text-gray-600" />
              <span className="flex-1">Meu Perfil</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </DropdownMenuItem>
          </Link>

          {user?.role === 'STUDENT' && (
            <>
              <Link href="/student/my-courses" onClick={() => setOpen(false)}>
                <DropdownMenuItem className="cursor-pointer px-4 py-2">
                  <BookOpen className="h-4 w-4 mr-3 text-gray-600" />
                  <span className="flex-1">Meus Cursos</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </DropdownMenuItem>
              </Link>

              <Link href="/student/profile" onClick={() => setOpen(false)}>
                <DropdownMenuItem className="cursor-pointer px-4 py-2">
                  <Trophy className="h-4 w-4 mr-3 text-yellow-600" />
                  <span className="flex-1">Conquistas</span>
                  <Badge variant="secondary" className="text-xs">3 novas</Badge>
                </DropdownMenuItem>
              </Link>
            </>
          )}

          {(user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR') && (
            <Link href="/admin/analytics" onClick={() => setOpen(false)}>
              <DropdownMenuItem className="cursor-pointer px-4 py-2">
                <BarChart3 className="h-4 w-4 mr-3 text-gray-600" />
                <span className="flex-1">Análises</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </DropdownMenuItem>
            </Link>
          )}

          <Link href="/settings" onClick={() => setOpen(false)}>
            <DropdownMenuItem className="cursor-pointer px-4 py-2">
              <Settings className="h-4 w-4 mr-3 text-gray-600" />
              <span className="flex-1">Configurações</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </DropdownMenuItem>
          </Link>
        </div>

        <DropdownMenuSeparator className="m-0" />

        {/* Logout */}
        <div className="p-2">
          <DropdownMenuItem
            className="cursor-pointer px-4 py-2 text-red-600 focus:text-red-700 focus:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-3" />
            <span className="flex-1 font-medium">Sair</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
