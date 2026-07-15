import { redirect } from 'next/navigation';

/**
 * Registro público desativado — acesso à plataforma é por convite
 * (teste fechado). Contas são pré-criadas via backend
 * (scripts/create-test-students.ts). Pra reabrir o registro, restaurar
 * esta página (git log) e o auto-create no backend.
 */
export default function RegisterPage() {
  redirect('/login');
}
