import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware simplificado
 * 
 * Como usamos localStorage para tokens, a verificação de autenticação
 * é feita no lado do cliente (nos componentes)
 */
export function middleware(request: NextRequest) {
  // Apenas permite que todas as requisições passem
  // A proteção de rotas é feita no lado do cliente
  return NextResponse.next();
}

/**
 * Configuração do matcher
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
