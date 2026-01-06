import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata = {
  title: 'Recuperar Senha | Projeto Cirurgião',
  description: 'Recupere sua senha da plataforma Projeto Cirurgião',
};

/**
 * Página de recuperação de senha
 */
export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ForgotPasswordForm />
    </div>
  );
}
