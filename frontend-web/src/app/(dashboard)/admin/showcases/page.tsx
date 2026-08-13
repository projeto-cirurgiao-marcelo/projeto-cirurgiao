'use client';

/**
 * Admin de vitrines — lista + painel de aulas órfãs.
 *
 * A vitrine é camada de PERMISSÃO, não de navegação: o aluno continua
 * navegando por curso. Uma vitrine pode cruzar cursos diferentes (é o caso
 * de "Castração", que vive em Treinamentos Premium e em Aprofundamento
 * Tecidos Moles ao mesmo tempo).
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Archive,
  ArchiveRestore,
  Globe,
  Loader2,
  Plus,
  ShoppingBag,
} from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showcasesService } from '@/lib/api/showcases.service';
import type { Showcase } from '@/lib/types/showcase.types';
import { OrphanVideosPanel } from './_components/orphan-videos-panel';

export default function AdminShowcasesPage() {
  const [showcases, setShowcases] = useState<Showcase[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [orphanCount, setOrphanCount] = useState<number | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    externalProductId: '',
    grantsAllContent: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await showcasesService.list(includeArchived);
      setShowcases(data);
    } catch (err) {
      toast.error('Erro ao carregar vitrines', {
        description: err instanceof Error ? err.message : '',
      });
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const created = await showcasesService.create({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        externalProductId: form.externalProductId.trim() || undefined,
        grantsAllContent: form.grantsAllContent,
      });
      toast.success('Vitrine criada', { description: created.slug });
      setCreateOpen(false);
      setForm({
        title: '',
        description: '',
        externalProductId: '',
        grantsAllContent: false,
      });
      await load();
    } catch (err) {
      toast.error('Erro ao criar vitrine', {
        description: err instanceof Error ? err.message : '',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(showcase: Showcase) {
    const warning =
      showcase.entitlementCount > 0
        ? `\n\n${showcase.entitlementCount} aluno(s) têm acesso por esta vitrine — o direito deles continua registrado, mas ela sai do admin.`
        : '';
    if (!confirm(`Arquivar "${showcase.title}"?${warning}`)) return;
    try {
      await showcasesService.archive(showcase.id);
      toast.success('Vitrine arquivada');
      await load();
    } catch (err) {
      toast.error('Erro ao arquivar', {
        description: err instanceof Error ? err.message : '',
      });
    }
  }

  async function handleRestore(showcase: Showcase) {
    try {
      await showcasesService.restore(showcase.id);
      toast.success('Vitrine restaurada');
      await load();
    } catch (err) {
      toast.error('Erro ao restaurar', {
        description: err instanceof Error ? err.message : '',
      });
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Vitrines</h1>
          <p className="text-sm text-muted-foreground">
            Cada vitrine é um produto vendido no TheMembers. Ela agrupa aulas de{' '}
            <strong>qualquer curso</strong> e define o que o comprador enxerga —
            o aluno continua navegando por curso.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova vitrine
        </Button>
      </header>

      <Tabs defaultValue="showcases">
        <TabsList>
          <TabsTrigger value="showcases">
            Vitrines {showcases.length > 0 && `(${showcases.length})`}
          </TabsTrigger>
          <TabsTrigger value="orphans">
            Aulas órfãs {orphanCount !== null && `(${orphanCount})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="showcases" className="space-y-3 pt-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={includeArchived}
              onCheckedChange={(v) => setIncludeArchived(v === true)}
            />
            Mostrar arquivadas
          </label>

          {loading ? (
            <div className="flex items-center justify-center rounded-lg border bg-card p-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : showcases.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
              Nenhuma vitrine ainda. Crie a primeira para começar a recortar o
              catálogo.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {showcases.map((showcase) => (
                <div
                  key={showcase.id}
                  className="flex flex-col gap-3 rounded-lg border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/showcases/${showcase.id}`}
                        className="font-medium hover:underline"
                      >
                        {showcase.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        /{showcase.slug}
                      </p>
                    </div>
                    {showcase.deletedAt ? (
                      <Badge variant="outline">Arquivada</Badge>
                    ) : showcase.isPublished ? (
                      <Badge>Publicada</Badge>
                    ) : (
                      <Badge variant="secondary">Rascunho</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {showcase.grantsAllContent ? (
                      <Badge variant="outline" className="gap-1">
                        <Globe className="h-3 w-3" />
                        Catálogo inteiro
                      </Badge>
                    ) : (
                      <Badge variant="outline">{showcase.videoCount} aulas</Badge>
                    )}
                    <Badge variant="outline">
                      {showcase.entitlementCount} com acesso
                    </Badge>
                    {showcase.externalProductId ? (
                      <Badge variant="outline" className="gap-1">
                        <ShoppingBag className="h-3 w-3" />
                        {showcase.externalProductId}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600">
                        Sem produto vinculado
                      </Badge>
                    )}
                  </div>

                  <div className="mt-auto flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/admin/showcases/${showcase.id}`}>Editar</Link>
                    </Button>
                    {showcase.deletedAt ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(showcase)}
                      >
                        <ArchiveRestore className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(showcase)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orphans" className="pt-3">
          <OrphanVideosPanel onCountChange={setOrphanCount} />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={(v) => !v && setCreateOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova vitrine</DialogTitle>
            <DialogDescription>
              O slug é gerado a partir do título. As aulas são adicionadas
              depois, na tela da vitrine.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Castração Descomplicada"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Texto de apoio para o admin."
              />
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
                compra. Errar este campo libera a vitrine errada para quem pagou —
                confira no painel do produto. Pode ficar vazio e ser preenchido
                depois.
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
                  Para a pós-graduação: dá acesso a tudo, inclusive a aulas
                  publicadas no futuro. Dispensa montar a lista.
                </span>
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!form.title.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
