import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de proteção de rotas — APENAS UX guard.
 *
 * Só verifica se há *algum* indício de sessão (cookie `auth-session` ou header
 * Authorization) para impedir acesso direto anônimo a URLs protegidas e
 * redirecionar pro /login. NÃO é fronteira de segurança.
 *
 * A autorização real (inclusive admin/RBAC) é feita no BACKEND, que valida o
 * Firebase ID token em cada request. Role vinda de cookie/localStorage é
 * forjável no client e por isso NÃO decide autorização aqui — confiar nela
 * seria uma falsa fronteira de segurança.
 */

// Rotas que requerem autenticação
const protectedPaths = ['/admin', '/student', '/onboarding'];

// Rotas públicas (não precisam de auth)
const publicPaths = ['/login', '/register', '/forgot-password', '/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar se é rota protegida
  const isProtectedRoute = protectedPaths.some((path) => pathname.startsWith(path));

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Verificar se existe indicação de sessão ativa
  // O Zustand persist salva em localStorage, mas podemos checar
  // um cookie de sessão que o AuthProvider pode setar
  const authCookie = request.cookies.get('auth-session');
  
  // Fallback: verificar header Authorization (para chamadas SSR)
  const authHeader = request.headers.get('authorization');

  if (!authCookie && !authHeader) {
    // Redirecionar para login preservando a URL de destino
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Com indício de sessão, segue. A distinção de role (admin vs student) e o
  // enforcement real acontecem no backend/UI autenticada, não aqui — o cookie
  // não é assinado e não pode ser fronteira de autorização.
  return NextResponse.next();
}

/**
 * Configuração do matcher
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.webp$).*)',
  ],
};
