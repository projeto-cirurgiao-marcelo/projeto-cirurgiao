'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Search, Bell, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/stores/auth-store';
import { cn } from '@/lib/utils';
import { ProfileDropdown } from './profile-dropdown';
import { NotificationCenter } from './notification-center';

interface NavItem {
  href: string;
  label: string;
  roles?: ('STUDENT' | 'INSTRUCTOR' | 'ADMIN')[];
}

const navItems: NavItem[] = [
  // Navegação do Estudante
  {
    href: '/student/my-courses',
    label: 'Meu Aprendizado',
    roles: ['STUDENT'],
  },
  {
    href: '/student/explore',
    label: 'Explorar',
    roles: ['STUDENT'],
  },
  {
    href: '/student/profile',
    label: 'Conquistas',
    roles: ['STUDENT'],
  },
  // Navegação do Admin
  {
    href: '/admin/courses',
    label: 'Cursos',
    roles: ['ADMIN', 'INSTRUCTOR'],
  },
  {
    href: '/admin/students',
    label: 'Alunos',
    roles: ['ADMIN'],
  },
  {
    href: '/admin/analytics',
    label: 'Análises',
    roles: ['ADMIN', 'INSTRUCTOR'],
  },
];

export function CourseraHeader() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar navegação baseado no role do usuário
  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  const isActive = (href: string) => {
    return pathname.startsWith(href);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            href={user?.role === 'ADMIN' ? '/admin/courses' : '/student/my-courses'}
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgb(var(--primary-500))] text-white shadow-md">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-bold text-gray-900 leading-tight">
                Projeto
              </span>
              <span className="text-[10px] font-semibold text-[rgb(var(--primary-500))] leading-tight">
                Cirurgião
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {filteredNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive(item.href) ? 'default' : 'ghost'}
                  className={cn(
                    'text-sm font-medium',
                    isActive(item.href)
                      ? 'bg-[rgb(var(--primary-500))] text-white hover:bg-[rgb(var(--primary-600))]'
                      : 'text-gray-700 hover:text-[rgb(var(--primary-600))] hover:bg-gray-100'
                  )}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Buscar cursos, vídeos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <NotificationCenter />
            <ProfileDropdown />
          </div>

          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Mobile Search Bar */}
        {searchOpen && (
          <div className="md:hidden border-t border-border px-6 py-3 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Buscar cursos, vídeos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-white">
            <nav className="container mx-auto px-6 py-4 space-y-2">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive(item.href) ? 'default' : 'ghost'}
                    className={cn(
                      'w-full justify-start text-sm font-medium',
                      isActive(item.href)
                        ? 'bg-[rgb(var(--primary-500))] text-white'
                        : 'text-gray-700'
                    )}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}

              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex items-center justify-between px-3">
                  <span className="text-sm font-medium text-gray-700">Notificações</span>
                  <NotificationCenter />
                </div>
                <ProfileDropdown mobile />
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Backdrop for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
