'use client';

/**
 * Aulas publicadas que não estão em NENHUMA vitrine.
 *
 * Como a composição da vitrine é uma lista explícita, aula nova nasce fora
 * de todas elas — invisível para quem pagou. Este painel é o mecanismo que
 * torna isso visível; sem ele, a decisão de "lista explícita" viraria uma
 * fila silenciosa de conteúdo perdido.
 *
 * Vitrine com "libera catálogo inteiro" NÃO conta como cobertura aqui:
 * ela zeraria a lista sozinha e esconderia justamente o que os compradores
 * de vitrine avulsa não enxergam.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { showcasesService } from '@/lib/api/showcases.service';
import type { OrphanVideo } from '@/lib/types/showcase.types';

export function OrphanVideosPanel({
  onCountChange,
}: {
  onCountChange?: (count: number) => void;
}) {
  const [videos, setVideos] = useState<OrphanVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await showcasesService.listOrphanVideos();
      setVideos(data);
      onCountChange?.(data.length);
    } catch (err) {
      toast.error('Erro ao carregar aulas órfãs', {
        description: err instanceof Error ? err.message : '',
      });
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const byCourse = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const filtered = term
      ? videos.filter(
          (v) =>
            v.title.toLowerCase().includes(term) ||
            v.courseTitle.toLowerCase().includes(term) ||
            v.moduleTitle.toLowerCase().includes(term),
        )
      : videos;

    const groups = new Map<string, OrphanVideo[]>();
    for (const video of filtered) {
      const list = groups.get(video.courseTitle) ?? [];
      list.push(video);
      groups.set(video.courseTitle, list);
    }
    return [...groups.entries()];
  }, [videos, filter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Aulas publicadas fora de qualquer vitrine — hoje ninguém que comprou
          uma vitrine avulsa consegue vê-las.
        </p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar
        </Button>
      </div>

      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtrar por aula, módulo ou curso"
        className="max-w-sm"
      />

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border bg-card p-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
          Nenhuma aula órfã — todas as aulas publicadas estão em pelo menos uma
          vitrine.
        </div>
      ) : (
        <div className="space-y-4">
          {byCourse.map(([courseTitle, items]) => (
            <div key={courseTitle} className="rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <span className="text-sm font-medium">{courseTitle}</span>
                <Badge variant="outline">{items.length}</Badge>
              </div>
              <ul className="divide-y">
                {items.map((video) => (
                  <li
                    key={video.id}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">{video.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {video.moduleTitle}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
