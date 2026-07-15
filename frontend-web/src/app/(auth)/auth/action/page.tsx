'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

/**
 * Custom email action handler do Firebase Auth (action URL do projeto
 * aponta pra cá). Trata mode=resetPassword (usado como convite do teste
 * fechado e no "Esqueceu sua senha?") e mode=verifyEmail.
 */

// Mesmas regras de senha do registerSchema (auth-schemas.ts)
const PASSWORD_RULES =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

type Screen =
  | 'validating'
  | 'form'
  | 'success'
  | 'verified'
  | 'invalid';

function ActionHandler() {
  const params = useSearchParams();
  const mode = params.get('mode');
  const oobCode = params.get('oobCode') ?? '';

  const [screen, setScreen] = useState<Screen>('validating');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setScreen('invalid');
      return;
    }
    if (mode === 'resetPassword') {
      verifyPasswordResetCode(auth, oobCode)
        .then((accountEmail) => {
          setEmail(accountEmail);
          setScreen('form');
        })
        .catch((err) => {
          logger.warn('[AuthAction] Código de reset inválido/expirado:', err?.code);
          setScreen('invalid');
        });
    } else if (mode === 'verifyEmail') {
      applyActionCode(auth, oobCode)
        .then(() => setScreen('verified'))
        .catch(() => setScreen('invalid'));
    } else {
      setScreen('invalid');
    }
  }, [mode, oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!PASSWORD_RULES.test(password)) {
      setFormError(
        'A senha precisa ter no mínimo 8 caracteres, com letra maiúscula, minúscula e número.',
      );
      return;
    }
    if (password !== confirm) {
      setFormError('As senhas não coincidem.');
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setScreen('success');
    } catch (err: any) {
      logger.error('[AuthAction] Erro ao definir senha:', err?.code);
      if (err?.code === 'auth/expired-action-code' || err?.code === 'auth/invalid-action-code') {
        setScreen('invalid');
      } else if (err?.code === 'auth/weak-password') {
        setFormError('Senha muito fraca. Escolha uma senha mais forte.');
      } else {
        setFormError('Não foi possível salvar a senha. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputProps = {
    className: 'bg-gray-900 border-gray-700 text-white placeholder:text-gray-500',
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.style.borderColor = '#FF005C';
      e.target.style.boxShadow = '0 0 0 1px #FF005C';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.style.borderColor = '';
      e.target.style.boxShadow = '';
    },
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Image
            src="/imgi_1_xvG8OSQtsPXQpn0XwJgs0Bx8jbRd32wOPHhuuitH.webp"
            alt="Projeto Cirurgião"
            width={600}
            height={60}
            className="h-12 w-auto"
            priority
          />
        </div>

        {screen === 'validating' && (
          <div className="text-center text-gray-400">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
            Validando seu link...
          </div>
        )}

        {screen === 'form' && (
          <>
            <h1 className="mb-2 text-center text-2xl font-bold text-white">
              Crie sua senha
            </h1>
            <p className="mb-8 text-center text-sm text-gray-400">
              Bem-vindo(a) ao Projeto Cirurgião! Defina a senha de acesso para{' '}
              <span className="text-white">{email}</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {formError && (
                <div className="rounded-md border border-red-500/50 bg-red-500/15 p-3 text-sm text-red-400">
                  {formError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  Nova senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  autoFocus
                  {...inputProps}
                />
                <p className="text-xs text-gray-500">
                  Mínimo 8 caracteres, com letra maiúscula, minúscula e número.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-gray-300">
                  Confirmar senha
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={submitting}
                  {...inputProps}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !password || !confirm}
                className="w-full rounded-full py-6 font-medium text-white transition-colors"
                style={{ backgroundColor: '#FF0000' }}
              >
                {submitting ? 'Salvando...' : 'Salvar senha e continuar'}
              </Button>
            </form>
          </>
        )}

        {screen === 'success' && (
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold text-white">Senha criada! 🎉</h1>
            <p className="mb-8 text-sm text-gray-400">
              Sua conta está pronta. Entre com seu e-mail e a senha que você
              acabou de criar.
            </p>
            <Button
              asChild
              className="w-full rounded-full py-6 font-medium text-white"
              style={{ backgroundColor: '#FF0000' }}
            >
              <Link href="/login">Ir para o login</Link>
            </Button>
          </div>
        )}

        {screen === 'verified' && (
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold text-white">E-mail verificado ✓</h1>
            <p className="mb-8 text-sm text-gray-400">
              Tudo certo com seu e-mail. Você já pode entrar na plataforma.
            </p>
            <Button
              asChild
              className="w-full rounded-full py-6 font-medium text-white"
              style={{ backgroundColor: '#FF0000' }}
            >
              <Link href="/login">Ir para o login</Link>
            </Button>
          </div>
        )}

        {screen === 'invalid' && (
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold text-white">
              Link inválido ou expirado
            </h1>
            <p className="mb-8 text-sm text-gray-400">
              Este link já foi usado ou passou da validade. Sem problema: peça
              um novo pela opção &quot;Esqueceu sua senha?&quot; usando o e-mail
              em que você recebeu o convite.
            </p>
            <Button
              asChild
              className="w-full rounded-full py-6 font-medium text-white"
              style={{ backgroundColor: '#FF0000' }}
            >
              <Link href="/forgot-password">Pedir novo link</Link>
            </Button>
            <div className="mt-4">
              <Link
                href="/login"
                className="text-sm text-gray-400 hover:text-gray-300"
              >
                Voltar ao login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthActionPage() {
  // useSearchParams exige Suspense boundary no App Router
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <ActionHandler />
    </Suspense>
  );
}
