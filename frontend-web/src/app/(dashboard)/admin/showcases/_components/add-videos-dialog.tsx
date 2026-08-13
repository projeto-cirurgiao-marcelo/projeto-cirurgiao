'use client';

/**
 * Busca de aulas por título para compor a vitrine.
 *
 * O resultado mostra curso e módulo porque títulos se repetem entre cursos
 * — "Castração Descomplicada" existe em Treinamentos Premium e em
 * Aprofundamento Tecidos Moles, e são aulas diferentes.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { showcasesService } from '@/lib/api/showcases.service';
import type { VideoSearchResult } from '@/lib/types/showcase.types';

export function AddVideosDialog({
  open,
  showcaseId,
  onClose,
  onAdded,
}: {
  open: boolean;
  showcaseId: string;
  onClose: () => void;
  onAdded: () => void | Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VideoSearchResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelected(new Set());
    }
  }, [open]);

  // Debounce simples: a busca dispara sozinha enquanto o admin digita.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await showcasesService.searchVideos(term, showcaseId);
        if (!cancelled) setResults(data);
      } catch (err) {
        if (!cancelled) {
          toast.error('Erro na busca', {
            description: err instanceof Error ? err.message : '',
          });
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, showcaseId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const result = await showcasesService.addVideos(showcaseId, [...selected]);
      toast.success(`${result.added} aula(s) adicionada(s)`, {
        description:
          result.added < result.requested
            ? `${result.requested - result.added} já estavam na vitrine`
            : undefined,
      });
      await onAdded();
      onClose();
    } catch (err) {
      toast.error('Erro ao adicionar aulas', {
        description: err instanceof Error ? err.message : '',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar aulas</DialogTitle>
          <DialogDescription>
            Busque por título. Só aulas publicadas aparecem aqui.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: castração"
            className="pl-8"
            autoFocus
          />
        </div>

        <div className="max-h-[50vh] min-h-[120px] overflow-y-auto rounded-md border">
          {searching ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {query.trim().length < 2
                ? 'Digite ao menos 2 caracteres.'
                : 'Nenhuma aula encontrada.'}
            </p>
          ) : (
            <ul className="divide-y">
              {results.map((video) => (
                <li key={video.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40 ${
                      video.inShowcase ? 'opacity-60' : ''
                    }`}
                  >
                    {video.inShowcase ? (
                      <Check className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <Checkbox
                        checked={selected.has(video.id)}
                        onCheckedChange={() => toggle(video.id)}
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{video.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {video.courseTitle} › {video.moduleTitle}
                      </span>
                    </span>
                    {video.inShowcase && (
                      <Badge variant="outline" className="shrink-0">
                        Já está
                      </Badge>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleAdd} disabled={selected.size === 0 || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar {selected.size > 0 && `(${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
