import { RegisterForm } from '@/components/auth/register-form';

export const metadata = {
  title: 'Criar Conta | Projeto Cirurgião',
  description: 'Crie sua conta na plataforma Projeto Cirurgião',
};

/**
 * Página de registro
 */
export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <RegisterForm />
    </div>
  );
}
