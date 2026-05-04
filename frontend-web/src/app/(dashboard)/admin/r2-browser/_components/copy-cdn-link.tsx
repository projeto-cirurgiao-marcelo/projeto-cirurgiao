'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface CopyCdnLinkProps {
  url: string;
  label?: string;
  size?: 'sm' | 'default';
}

const CLEAR_MS = 1500;

export function CopyCdnLink({
  url,
  label = 'Copiar link',
  size = 'sm',
}: CopyCdnLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiado', { description: url });
      setTimeout(() => setCopied(false), CLEAR_MS);
    } catch (err) {
      toast.error('Falha ao copiar', {
        description: err instanceof Error ? err.message : 'erro desconhecido',
      });
    }
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleCopy}
      title={url}
      className="font-normal"
    >
      {copied ? (
        <Check className="mr-2 h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="mr-2 h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  );
}
