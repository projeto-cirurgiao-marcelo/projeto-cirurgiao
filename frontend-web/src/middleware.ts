import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de proteção de rotas
 * 
 * Verifica se existe um cookie/header de autenticação para rotas protegidas.
 * Como usamos localStorage (Zustand persist) no frontend, o middleware
 * faz uma verificação básica via cookie de sessão.
 * 
 * A validação completa do token continua no lado do cliente (AuthProvider).
 * O middleware impede acesso direto a URLs protegidas sem sessão ativa.
 */

// Rotas que requerem autenticação
const protectedPaths = ['/admin', '/student'];

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

  // Verificação de role básica para /admin
  if (pathname.startsWith('/admin') && authCookie) {
    try {
      const sessionData = JSON.parse(authCookie.value);
      if (sessionData.role && sessionData.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/student/courses', request.url));
      }
    } catch {
      // Cookie malformado — deixar AuthProvider lidar
    }
  }

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
