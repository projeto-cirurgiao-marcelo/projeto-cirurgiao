'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Loader2, Mail, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usersService } from '@/lib/api/users.service';
import { getErrorMessage } from '@/lib/api/client';
import { logger } from '@/lib/logger';
import type { InviteStudentResponse, StudentWithStats } from '@/lib/types/user.types';

interface InviteStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando informado, o diálogo vira "reenviar convite" pra esse aluno. */
  student?: StudentWithStats | null;
  /** Chamado após um convite bem-sucedido (ex.: recarregar a lista). */
  onInvited?: () => void;
}

/**
 * Convite de aluno pelo painel: cria a conta (se não existir), gera o link
 * de criação de senha (uso único, 7 dias) e dispara o e-mail. O link fica
 * visível pra copiar e mandar por WhatsApp quando o e-mail não chega.
 */
export function InviteStudentDialog({
  open,
  onOpenChange,
  student,
  onInvited,
}: InviteStudentDialogProps) {
  const resend = Boolean(student);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteStudentResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail(student?.email ?? '');
    setName(student?.name ?? '');
    setSendEmail(true);
    setError(null);
    setResult(null);
    setCopied(false);
  }, [open, student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = student
        ? await usersService.resendInvite(student.id, sendEmail)
        : await usersService.inviteStudent({
            email: email.trim(),
            name: name.trim() || undefined,
            sendEmail,
          });
      setResult(res);
      onInvited?.();
    } catch (err) {
      setError(getErrorMessage(err));
      logger.error('Erro ao convidar aluno:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Erro ao copiar link de convite:', err);
    }
  };

  const expiresLabel = result
    ? new Date(result.expiresAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{resend ? 'Reenviar convite' : 'Convidar aluno'}</DialogTitle>
          <DialogDescription>
            {resend
              ? 'Gera um novo link de criação de senha para este aluno e reenvia o e-mail.'
              : 'Cria a conta do aluno e envia o e-mail de criação de senha. O link também fica disponível para enviar por WhatsApp.'}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900 p-3 text-sm">
              <p className="font-medium text-green-800 dark:text-green-300">
                {result.created ? 'Conta criada e convite gerado' : 'Convite gerado'} para{' '}
                {result.user.email}
              </p>
              <p className="text-green-700 dark:text-green-400 mt-1">
                {result.emailSent
                  ? 'E-mail de criação de senha enviado.'
                  : sendEmail
                    ? 'O e-mail não pôde ser enviado — envie o link abaixo manualmente.'
                    : 'E-mail não enviado (opção desmarcada). Envie o link abaixo.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-url">Link de convite (uso único, válido até {expiresLabel})</Label>
              <div className="flex gap-2">
                <Input id="invite-url" readOnly value={result.inviteUrl} className="font-mono text-xs" />
                <Button type="button" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span className="ml-1.5">{copied ? 'Copiado' : 'Copiar'}</span>
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">E-mail</Label>
              <Input
                id="invite-email"
                type="email"
                required
                disabled={resend}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aluno@exemplo.com"
                autoFocus={!resend}
              />
            </div>

            {!resend && (
              <div className="space-y-1.5">
                <Label htmlFor="invite-name">Nome (opcional)</Label>
                <Input
                  id="invite-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Se vazio, é derivado do e-mail"
                />
              </div>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-4 w-4 rounded border-atlas-line"
              />
              <Mail className="h-4 w-4 text-atlas-muted" />
              Enviar e-mail de criação de senha
            </label>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting || !email.trim()}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="ml-1.5">{resend ? 'Gerar novo convite' : 'Convidar'}</span>
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
