'use client';

/**
 * Atalho de curadoria: adiciona todas as aulas de um módulo de uma vez.
 *
 * IMPORTANTE: materializa uma linha por aula NO CLIQUE. Não é vínculo
 * dinâmico — aula criada no módulo depois não entra sozinha, e aparece no
 * painel de aulas órfãs.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { showcasesService } from '@/lib/api/showcases.service';
import type { CourseTreeItem } from '@/lib/types/showcase.types';

export function AddModuleDialog({
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
  const [tree, setTree] = useState<CourseTreeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [includeSubmodules, setIncludeSubmodules] = useState(true);
  const [pendingModuleId, setPendingModuleId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    showcasesService
      .courseTree()
      .then((data) => {
        if (!cancelled) setTree(data);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error('Erro ao carregar cursos', {
            description: err instanceof Error ? err.message : '',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function toggleCourse(courseId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  }

  async function handleAddModule(moduleId: string, moduleTitle: string) {
    setPendingModuleId(moduleId);
    try {
      const result = await showcasesService.addModuleVideos(showcaseId, moduleId, {
        includeSubmodules,
      });
      if (result.requested === 0) {
        toast.info(`"${moduleTitle}" não tem aulas publicadas`);
      } else {
        toast.success(`${result.added} aula(s) de "${result.moduleTitle}"`, {
          description:
            result.added < result.requested
              ? `${result.requested - result.added} já estavam na vitrine`
              : undefined,
        });
      }
      await onAdded();
    } catch (err) {
      toast.error('Erro ao adicionar módulo', {
        description: err instanceof Error ? err.message : '',
      });
    } finally {
      setPendingModuleId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar módulo inteiro</DialogTitle>
          <DialogDescription>
            As aulas publicadas do módulo entram na vitrine agora. Aulas
            adicionadas ao módulo depois não entram sozinhas — elas aparecem no
            painel de aulas órfãs.
          </DialogDescription>
        </DialogHeader>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={includeSubmodules}
            onCheckedChange={(v) => setIncludeSubmodules(v === true)}
          />
          Incluir aulas dos submódulos
        </label>

        <div className="max-h-[50vh] overflow-y-auto rounded-md border">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ul className="divide-y">
              {tree.map((course) => (
                <li key={course.id}>
                  <button
                    type="button"
                    onClick={() => toggleCourse(course.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/40"
                  >
                    {expanded.has(course.id) ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{course.title}</span>
                    <Badge variant="outline">{course.modules.length} módulos</Badge>
                  </button>

                  {expanded.has(course.id) && (
                    <ul className="border-t bg-muted/20">
                      {course.modules.map((module) => {
                        const subCount = module.subModules.reduce(
                          (acc, s) => acc + s.videoCount,
                          0,
                        );
                        const total = module.videoCount + (includeSubmodules ? subCount : 0);
                        return (
                          <li
                            key={module.id}
                            className="flex items-center gap-3 px-3 py-2 pl-9 text-sm"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {module.title}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {total} aula(s)
                                {module.subModules.length > 0 &&
                                  ` · ${module.subModules.length} submódulo(s)`}
                              </span>
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={pendingModuleId === module.id || total === 0}
                              onClick={() => handleAddModule(module.id, module.title)}
                            >
                              {pendingModuleId === module.id && (
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              )}
                              Adicionar
                            </Button>
                          </li>
                        );
                      })}
                      {course.modules.length === 0 && (
                        <li className="px-3 py-2 pl-9 text-xs text-muted-foreground">
                          Sem módulos.
                        </li>
                      )}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
