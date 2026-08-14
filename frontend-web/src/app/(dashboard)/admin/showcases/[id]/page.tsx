'use client';

/**
 * Vitrine — edição e composição.
 *
 * A lista de aulas é explícita: cada linha aqui é uma linha em
 * ShowcaseVideo. "Adicionar módulo inteiro" materializa as linhas no clique;
 * remover uma aula depois não desfaz as outras nem re-liga o módulo.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FolderPlus,
  Globe,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { showcasesService } from '@/lib/api/showcases.service';
import { ThumbnailUpload } from '@/components/admin/thumbnail-upload';
import type { ShowcaseDetail } from '@/lib/types/showcase.types';
import { AddVideosDialog } from '../_components/add-videos-dialog';
import { AddModuleDialog } from '../_components/add-module-dialog';

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ShowcaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const showcaseId = params.id;

  const [showcase, setShowcase] = useState<ShowcaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addVideosOpen, setAddVideosOpen] = useState(false);
  const [addModuleOpen, setAddModuleOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    thumbnail: '',
    externalProductId: '',
    previewSeconds: '',
    grantsAllContent: false,
    isPublished: false,
  });

  // Refresh depois de adicionar/remover aula NÃO pode ligar o loading: a
  // página inteira desmontaria, e com ela o dialog aberto — que voltaria
  // com a árvore recolhida no meio da curadoria.
  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const data = await showcasesService.get(showcaseId);
      setShowcase(data);
      setForm({
        title: data.title,
        description: data.description ?? '',
        thumbnail: data.thumbnail ?? '',
        externalProductId: data.externalProductId ?? '',
        previewSeconds: data.previewSeconds?.toString() ?? '',
        grantsAllContent: data.grantsAllContent,
        isPublished: data.isPublished,
      });
    } catch (err) {
      toast.error('Erro ao carregar vitrine', {
        description: err instanceof Error ? err.message : '',
      });
    } finally {
      setLoading(false);
    }
  }, [showcaseId]);

  useEffect(() => {
    load(true);
  }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      await showcasesService.update(showcaseId, {
        title: form.title.trim(),
        description: form.description.trim(),
        thumbnail: form.thumbnail,
        externalProductId: form.externalProductId.trim(),
        previewSeconds: form.previewSeconds ? Number(form.previewSeconds) : undefined,
        grantsAllContent: form.grantsAllContent,
        isPublished: form.isPublished,
      });
      toast.success('Vitrine salva');
      await load();
    } catch (err) {
      toast.error('Erro ao salvar', {
        description: err instanceof Error ? err.message : '',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveVideo(videoId: string, title: string) {
    if (!confirm(`Remover "${title}" desta vitrine?`)) return;
    try {
      await showcasesService.removeVideo(showcaseId, videoId);
      toast.success('Aula removida da vitrine');
      await load();
    } catch (err) {
      toast.error('Erro ao remover', {
        description: err instanceof Error ? err.message : '',
      });
    }
  }

  const byCourse = useMemo(() => {
    if (!showcase) return [];
    const groups = new Map<string, ShowcaseDetail['videos']>();
    for (const video of showcase.videos) {
      const list = groups.get(video.courseTitle) ?? [];
      list.push(video);
      groups.set(video.courseTitle, list);
    }
    return [...groups.entries()];
  }, [showcase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!showcase) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/admin/showcases')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vitrines
        </Button>
        <p className="text-sm text-muted-foreground">Vitrine não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1">
            <Link href="/admin/showcases">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Vitrines
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">{showcase.title}</h1>
          <p className="text-sm text-muted-foreground">
            /{showcase.slug} · {showcase.entitlementCount} aluno(s) com acesso
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium">Dados da vitrine</h2>

          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Capa</Label>
            <ThumbnailUpload
              value={form.thumbnail}
              onChange={(url) => setForm((f) => ({ ...f, thumbnail: url }))}
              aspectRatio="horizontal"
              label="Capa da vitrine"
            />
            <p className="text-xs text-muted-foreground">
              Sem capa própria, o card do aluno usa a arte do módulo da
              primeira aula da vitrine.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>ID do produto (TheMembers)</Label>
            <Input
              value={form.externalProductId}
              onChange={(e) =>
                setForm({ ...form, externalProductId: e.target.value })
              }
              placeholder="product.id do checkout"
            />
            <p className="text-xs text-muted-foreground">
              É o <code>product.id</code> que o TheMembers envia no webhook de
              compra — o que liga esta vitrine ao produto vendido. Errar aqui
              libera a vitrine errada para quem pagou.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Preview (segundos)</Label>
            <Input
              type="number"
              min={0}
              value={form.previewSeconds}
              onChange={(e) =>
                setForm({ ...form, previewSeconds: e.target.value })
              }
              placeholder="Padrão: 120"
            />
            <p className="text-xs text-muted-foreground">
              Override do padrão global para quem ainda não comprou. Vazio usa o
              padrão.
            </p>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={form.grantsAllContent}
              onCheckedChange={(v) =>
                setForm({ ...form, grantsAllContent: v === true })
              }
            />
            <span>
              Libera o catálogo inteiro
              <span className="block text-xs text-muted-foreground">
                Pós-graduação: acesso a tudo, inclusive ao que for publicado
                depois. A lista de aulas abaixo passa a ser irrelevante.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={form.isPublished}
              onCheckedChange={(v) => setForm({ ...form, isPublished: v === true })}
            />
            <span>Publicada</span>
          </label>
        </section>

        <section className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium">
              Aulas da vitrine ({showcase.videos.length})
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddModuleOpen(true)}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Adicionar módulo inteiro
              </Button>
              <Button size="sm" onClick={() => setAddVideosOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar aulas
              </Button>
            </div>
          </div>

          {showcase.grantsAllContent && (
            <div className="flex items-start gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              <Globe className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Esta vitrine libera o catálogo inteiro. A lista abaixo continua
                salva, mas não governa o acesso enquanto a opção estiver ligada.
              </span>
            </div>
          )}

          {showcase.videos.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Nenhuma aula ainda. Use a busca ou adicione um módulo inteiro — a
              vitrine pode misturar aulas de cursos diferentes.
            </div>
          ) : (
            <div className="space-y-4">
              {byCourse.map(([courseTitle, items]) => (
                <div key={courseTitle} className="rounded-lg border">
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <span className="text-sm font-medium">{courseTitle}</span>
                    <Badge variant="outline">{items.length}</Badge>
                  </div>
                  <ul className="divide-y">
                    {items.map((video) => (
                      <li
                        key={video.videoId}
                        className="flex items-center gap-3 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate">
                            {video.title}
                            {!video.isPublished && (
                              <Badge variant="secondary" className="ml-2">
                                Não publicada
                              </Badge>
                            )}
                            {video.isDeleted && (
                              <Badge variant="outline" className="ml-2 text-amber-600">
                                Aula excluída
                              </Badge>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {video.parentModuleTitle
                              ? `${video.parentModuleTitle} › ${video.moduleTitle}`
                              : video.moduleTitle}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDuration(video.duration)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVideo(video.videoId, video.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <AddVideosDialog
        open={addVideosOpen}
        showcaseId={showcaseId}
        onClose={() => setAddVideosOpen(false)}
        onAdded={() => load()}
      />
      <AddModuleDialog
        open={addModuleOpen}
        showcaseId={showcaseId}
        onClose={() => setAddModuleOpen(false)}
        onAdded={() => load()}
      />
    </div>
  );
}
