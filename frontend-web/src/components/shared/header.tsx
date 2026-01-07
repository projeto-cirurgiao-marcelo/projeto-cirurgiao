'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  GraduationCap,
  Trophy,
  User,
  Menu,
  X,
  Search,
  Bell,
  LogOut,
  Settings,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('STUDENT' | 'INSTRUCTOR' | 'ADMIN')[];
}

const navItems: NavItem[] = [
  {
    href: '/student/my-courses',
    label: 'Meu Aprendizado',
    icon: BookOpen,
    roles: ['STUDENT'],
  },
  {
    href: '/courses',
    label: 'Explorar',
    icon: Search,
    roles: ['STUDENT'],
  },
  {
    href: '/student/profile',
    label: 'Conquistas',
    icon: Trophy,
    roles: ['STUDENT'],
  },
  {
    href: '/admin/courses',
    label: 'Gerenciar Cursos',
    icon: GraduationCap,
    roles: ['ADMIN', 'INSTRUCTOR'],
  },
  {
    href: '/admin/analytics',
    label: 'Análises',
    icon: BarChart3,
    roles: ['ADMIN', 'INSTRUCTOR'],
  },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  const isActive = (href: string) => {
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center space-x-2 transition-opacity hover:opacity-80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgb(var(--primary-500))] text-white shadow-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="hidden font-bold text-xl md:inline-block bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--primary-400))] bg-clip-text text-transparent">
              Projeto Cirurgião
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:items-center md:space-x-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? 'default' : 'ghost'}
                    className={cn(
                      'gap-2',
                      isActive(item.href) &&
                        'bg-[rgb(var(--primary-500))] text-white hover:bg-[rgb(var(--primary-600))]'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex md:items-center md:space-x-3">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {/* Notification badge */}
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[rgb(var(--error))] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[rgb(var(--error))]"></span>
              </span>
            </Button>

            {/* Profile Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[rgb(var(--primary-400))] to-[rgb(var(--accent-500))] text-white font-semibold text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </Button>

              {/* Dropdown Menu */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg bg-card border border-border shadow-xl py-2 modal-content">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="font-semibold text-sm text-foreground">
                      {user?.name || 'Usuário'}
                    </p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>

                  <Link href="/student/profile" onClick={() => setProfileMenuOpen(false)}>
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-3 transition-colors">
                      <User className="h-4 w-4" />
                      Meu Perfil
                    </button>
                  </Link>

                  <Link href="/settings" onClick={() => setProfileMenuOpen(false)}>
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-3 transition-colors">
                      <Settings className="h-4 w-4" />
                      Configurações
                    </button>
                  </Link>

                  <div className="border-t border-border mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-[rgb(var(--error))] hover:bg-muted flex items-center gap-3 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background modal-content">
          <nav className="container mx-auto px-4 py-4 space-y-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive(item.href) ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3"
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}

            <div className="pt-4 border-t border-border space-y-2">
              <Link href="/student/profile" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <User className="h-5 w-5" />
                  Meu Perfil
                </Button>
              </Link>

              <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <Settings className="h-5 w-5" />
                  Configurações
                </Button>
              </Link>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-[rgb(var(--error))]"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                Sair
              </Button>
            </div>
          </nav>
        </div>
      )}

      {/* Backdrop for profile menu */}
      {profileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm modal-backdrop"
          onClick={() => setProfileMenuOpen(false)}
        />
      )}
    </header>
  );
}
