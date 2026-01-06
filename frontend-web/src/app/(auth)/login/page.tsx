'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/stores/auth-store';
import { loginSchema, type LoginFormData } from '@/lib/schemas/auth-schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await login(data);
      // Pegar o usuário do store após o login
      const currentUser = useAuthStore.getState().user;
      // Redirecionar baseado no tipo de usuário
      if (currentUser?.role === 'ADMIN') {
        router.push('/admin/courses');
      } else {
        router.push('/student/my-courses');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterClick = () => {
    router.push('/register');
  };

  return (
    <div className="flex min-h-screen bg-black">
      {/* Lado Esquerdo - Imagem */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <Image
          src="/imgi_7_tNKlsOMAE761TVFdUFCTggYH77EjfNfPmkbmsmf0.webp"
          alt="Cirurgião Veterinário"
          fill
          className="object-cover"
          priority
        />
        
        {/* Overlay com texto no rodapé */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-sm mb-1">
            A MAIOR COMUNIDADE DE CIRURGIÕES
          </p>
          <p className="text-white text-sm mb-4">
            VETERINÁRIOS DO BRASIL
          </p>
          <p className="text-white/70 text-xs">
            Feito com <span style={{ color: '#FF005C' }}>❤</span> para você
          </p>
          <p className="text-white/50 text-xs mt-1">
            Copyright © 2025 - Projeto Cirurgião
          </p>
          <p className="text-white/50 text-xs">
            Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-black">
        <div className="w-full max-w-md">
          {/* Logo para mobile */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Image
              src="/imgi_1_xvG8OSQtsPXQpn0XwJgs0Bx8jbRd32wOPHhuuitH.webp"
              alt="Projeto Cirurgião"
              width={600}
              height={60}
              className="h-12 w-auto"
            />
          </div>

          {/* Logo e título */}
          <div className="mb-8 hidden lg:block">
            <h1 className="text-white text-3xl font-bold">
              Projeto<span className="font-normal">Cirurgião</span>
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex mb-8 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 pb-4 text-center transition-colors ${
                activeTab === 'login'
                  ? 'border-b-2'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              style={activeTab === 'login' ? { color: '#FF0000', borderColor: '#FF0000' } : {}}
            >
              Acessar sua conta
            </button>
            <button
              onClick={handleRegisterClick}
              className={`flex-1 pb-4 text-center transition-colors ${
                activeTab === 'register'
                  ? 'border-b-2'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              style={activeTab === 'register' ? { color: '#FF0000', borderColor: '#FF0000' } : {}}
            >
              Crie sua conta
            </button>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-500/15 border border-red-500/50 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* E-mail */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder=""
                {...register('email')}
                disabled={isLoading}
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                onFocus={(e) => {
                  e.target.style.borderColor = '#FF005C';
                  e.target.style.boxShadow = '0 0 0 1px #FF005C';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '';
                  e.target.style.boxShadow = '';
                }}
              />
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder=""
                {...register('password')}
                disabled={isLoading}
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                onFocus={(e) => {
                  e.target.style.borderColor = '#FF005C';
                  e.target.style.boxShadow = '0 0 0 1px #FF005C';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '';
                  e.target.style.boxShadow = '';
                }}
              />
              {errors.password && (
                <p className="text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Lembrar de mim */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked: boolean) => setRememberMe(checked)}
                className="border-gray-600"
                style={rememberMe ? { backgroundColor: '#FF005C', borderColor: '#FF005C' } : {}}
              />
              <label
                htmlFor="remember"
                className="text-sm text-gray-300 cursor-pointer"
              >
                Lembrar de mim
              </label>
            </div>

            {/* Botão Entrar */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full text-white font-medium py-6 rounded-full transition-colors"
              style={{ backgroundColor: '#FF0000' }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#CC0000';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#FF0000';
              }}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>

            {/* Esqueceu sua senha */}
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-gray-400 transition-colors"
                onMouseEnter={(e) => e.currentTarget.style.color = '#FF005C'}
                onMouseLeave={(e) => e.currentTarget.style.color = ''}
              >
                Esqueceu sua senha?
              </Link>
            </div>
          </form>

          {/* Footer mobile */}
          <div className="lg:hidden mt-12 text-center">
            <p className="text-gray-500 text-xs">
              Feito com <span style={{ color: '#FF005C' }}>❤</span> para você
            </p>
            <p className="text-gray-600 text-xs mt-1">
              Copyright © 2025 - Projeto Cirurgião
            </p>
            <p className="text-gray-600 text-xs">
              Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
