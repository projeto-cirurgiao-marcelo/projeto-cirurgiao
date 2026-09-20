'use client';

/**
 * Moderação de vidas salvas. Admin continua shadcn (fora do escopo Atlas).
 * Aprovar = entra no contador. Rejeitar devolve ao autor com motivo.
 */

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, HeartPulse, Loader2, MonitorPlay, Plus, Trash2, X } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { livesSavedService } from '@/lib/api/lives-saved.service';
import { getErrorMessage } from '@/lib/api/client';
import {
  SPECIES_LABEL,
  STATUS_LABEL,
  type AdminReportDetail,
  type AdminReportRow,
  type AdminStats,
  type AnimalSpecies,
  type DisplayToken,
  type LifeSavedStatus,
} from '@/lib/types/lives-saved.types';

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

export default function AdminLivesSavedPage() {
  const [tab, setTab] = useState<Tab>('PENDING');
  const [rows, setRows] = useState<AdminReportRow[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AdminReportDetail | null>(null);
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [screensOpen, setScreensOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([livesSavedService.adminList(tab), livesSavedService.adminStats()]);
      setRows(list.items);
      setStats(s);
    } catch (err) {
      toast.error('Erro ao carregar relatos', { description: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function open(id: string) {
    try {
      setDetail(await livesSavedService.adminDetail(id));
    } catch (err) {
      toast.error('Erro ao abrir relato', { description: getErrorMessage(err) });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <HeartPulse className="h-6 w-6 text-blue-600" /> Vidas salvas
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {stats ? `${stats.approved} aprovados · ${stats.pending} aguardando · ${stats.rejected} devolvidos` : ' '}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setScreensOpen(true)}>
            <MonitorPlay className="h-4 w-4 mr-1" /> Telas
          </Button>
          <Button onClick={() => setBackfillOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Relato histórico
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="PENDING">Aguardando {stats?.pending ? `(${stats.pending})` : ''}</TabsTrigger>
          <TabsTrigger value="APPROVED">Aprovados</TabsTrigger>
          <TabsTrigger value="REJECTED">Devolvidos</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-12 text-center">Nada aqui.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500 border-b">
              <tr>
                <th className="px-4 py-3">Autor</th>
                <th className="px-4 py-3">Relato</th>
                <th className="px-4 py-3">Espécie</th>
                <th className="px-4 py-3">Enviado</th>
                <th className="px-4 py-3">Mídia</th>
                <th className="px-4 py-3">Exibição</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => open(r.id)} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.onBehalfOfName ?? r.reporterName}</div>
                    <div className="text-xs text-gray-500 font-mono">{r.reporterCrmv ?? 'sem CRMV'}</div>
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <div className="line-clamp-2 text-gray-700 dark:text-gray-300">{r.procedureSummary || r.attribution}</div>
                  </td>
                  <td className="px-4 py-3">{r.species ? SPECIES_LABEL[r.species] : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{fmt(r.submittedAt)}</td>
                  <td className="px-4 py-3 text-gray-500">{r._count?.media ?? 0}</td>
                  <td className="px-4 py-3">
                    {r.consentPublicStory ? <Badge variant="secondary">pública</Badge> : <Badge variant="outline">privada</Badge>}
                    {r.source === 'ADMIN_BACKFILL' && <Badge variant="outline" className="ml-1">histórico</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailDialog detail={detail} onClose={() => setDetail(null)} onChanged={() => { setDetail(null); load(); }} />
      <ScreensDialog open={screensOpen} onClose={() => setScreensOpen(false)} />
      <BackfillDialog open={backfillOpen} onClose={() => setBackfillOpen(false)} onCreated={() => { setBackfillOpen(false); setTab('APPROVED'); load(); }} />
    </div>
  );
}

// ---------------------------------------------------------------- detalhe

function DetailDialog({ detail, onClose, onChanged }: { detail: AdminReportDetail | null; onClose: () => void; onChanged: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState(detail?.media ?? []);

  useEffect(() => {
    setReason('');
    setMedia(detail?.media ?? []);
  }, [detail]);

  if (!detail) return null;
  const status: LifeSavedStatus = detail.status;

  async function act(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      onChanged();
    } catch (err) {
      toast.error('Não foi possível concluir', { description: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function dropMedia(mediaId: string) {
    if (!detail) return;
    try {
      await livesSavedService.adminRemoveMedia(detail.id, mediaId);
      setMedia((m) => m.filter((x) => x.id !== mediaId));
      toast.success('Mídia removida');
    } catch (err) {
      toast.error('Não foi possível remover', { description: getErrorMessage(err) });
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {detail.onBehalfOfName ?? detail.reporterName}
            <Badge variant="outline">{STATUS_LABEL[status]}</Badge>
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {detail.reporterCrmv ?? 'sem CRMV'} · {detail.reporterTitle ?? 'cargo não informado'} · conta {detail.reporter.email}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600 dark:text-gray-400">
          <Kv k="Espécie" v={detail.species ? SPECIES_LABEL[detail.species] + (detail.speciesOther ? ` (${detail.speciesOther})` : '') : '—'} />
          <Kv k="Animal" v={detail.animalName ?? '—'} />
          <Kv k="Data do caso" v={fmt(detail.occurredAt)} />
          <Kv k="Impacto" v={detail.impactType === 'DIRECT' ? 'Direto' : detail.impactType === 'INDIRECT' ? 'Indireto' : '—'} />
          <Kv k="Curso" v={detail.relatedCourse?.title ?? '—'} />
          <Kv k="Exibição pública" v={detail.consentPublicStory ? 'sim' : 'não'} />
          <Kv k="Mostrar nome" v={detail.consentShowName ? 'sim' : 'não'} />
          <Kv k="Revisado" v={detail.reviewedBy ? `${detail.reviewedBy.name} · ${fmt(detail.reviewedAt)}` : '—'} />
        </div>

        {detail.procedureSummary && <p className="font-medium">{detail.procedureSummary}</p>}
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Por que atribui ao Projeto Cirurgião</div>
          <div className="font-serif text-[15px] leading-relaxed whitespace-pre-wrap max-w-[70ch]">{detail.attribution}</div>
        </div>

        {media.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {media.map((m) => (
              <div key={m.id} className="relative group aspect-[4/3] rounded-md overflow-hidden border bg-gray-100">
                {m.kind === 'VIDEO' ? (
                  <video src={m.url} controls preload="metadata" className="w-full h-full object-contain bg-black" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.caption ?? ''} className="w-full h-full object-cover" />
                )}
                <button type="button" onClick={() => dropMedia(m.id)} aria-label="Remover mídia" className="absolute top-1 right-1 h-7 w-7 rounded bg-white/90 border grid place-items-center opacity-0 group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {detail.rejectionReason && status === 'REJECTED' && (
          <p className="text-sm text-amber-700 border border-amber-300 rounded-md px-3 py-2">Motivo: {detail.rejectionReason}</p>
        )}

        {status !== 'DRAFT' && (
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (obrigatório pra devolver)</Label>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explique ao autor o que precisa mudar" rows={2} />
          </div>
        )}

        <DialogFooter className="gap-2">
          {status !== 'REJECTED' && status !== 'DRAFT' && (
            <Button variant="outline" disabled={busy || !reason.trim()} onClick={() => act(() => livesSavedService.reject(detail.id, reason.trim()), 'Relato devolvido')}>
              <X className="h-4 w-4 mr-1" /> Devolver
            </Button>
          )}
          {status !== 'APPROVED' && status !== 'DRAFT' && (
            <Button disabled={busy} onClick={() => act(() => livesSavedService.approve(detail.id), 'Relato aprovado')}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} Aprovar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="uppercase tracking-wide text-[10px]">{k}</div>
      <div className="text-gray-900 dark:text-gray-100">{v}</div>
    </div>
  );
}

// ---------------------------------------------------------------- backfill

function BackfillDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ reporterName: '', reporterCrmv: '', reporterTitle: '', attribution: '', species: '' as '' | AnimalSpecies, occurredAt: '', procedureSummary: '', consentPublicStory: false, consentShowName: false });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.reporterName.trim() || !form.attribution.trim()) return;
    setSaving(true);
    try {
      await livesSavedService.adminCreate({
        reporterName: form.reporterName.trim(),
        onBehalfOfName: form.reporterName.trim(),
        attribution: form.attribution.trim(),
        reporterCrmv: form.reporterCrmv.trim() || undefined,
        reporterTitle: form.reporterTitle.trim() || undefined,
        species: form.species || undefined,
        occurredAt: form.occurredAt || undefined,
        procedureSummary: form.procedureSummary.trim() || undefined,
        consentPublicStory: form.consentPublicStory,
        consentShowName: form.consentShowName,
      });
      toast.success('Relato histórico adicionado', { description: 'Já conta no número.' });
      setForm({ reporterName: '', reporterCrmv: '', reporterTitle: '', attribution: '', species: '', occurredAt: '', procedureSummary: '', consentPublicStory: false, consentShowName: false });
      onCreated();
    } catch (err) {
      toast.error('Não foi possível criar', { description: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relato histórico</DialogTitle>
          <DialogDescription>Caso anterior à plataforma. Nasce aprovado e entra no contador na hora. CRMV é opcional aqui.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1"><Label>Nome do veterinário *</Label><Input value={form.reporterName} onChange={(e) => setForm({ ...form, reporterName: e.target.value })} /></div>
            <div className="space-y-1"><Label>CRMV</Label><Input className="font-mono" value={form.reporterCrmv} onChange={(e) => setForm({ ...form, reporterCrmv: e.target.value })} /></div>
            <div className="space-y-1"><Label>Cargo</Label><Input value={form.reporterTitle} onChange={(e) => setForm({ ...form, reporterTitle: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Espécie</Label>
              <select className="w-full h-9 rounded-md border bg-transparent px-3 text-sm" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value as '' | AnimalSpecies })}>
                <option value="">Não informar</option>
                {(Object.keys(SPECIES_LABEL) as AnimalSpecies[]).map((k) => <option key={k} value={k}>{SPECIES_LABEL[k]}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>Data do caso</Label><Input type="date" value={form.occurredAt} onChange={(e) => setForm({ ...form, occurredAt: e.target.value })} /></div>
            <div className="col-span-2 space-y-1"><Label>Procedimento em uma linha</Label><Input maxLength={160} value={form.procedureSummary} onChange={(e) => setForm({ ...form, procedureSummary: e.target.value })} /></div>
          </div>
          <div className="space-y-1">
            <Label>Por que atribui ao Projeto Cirurgião *</Label>
            <Textarea rows={6} value={form.attribution} onChange={(e) => setForm({ ...form, attribution: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.consentPublicStory} onChange={(e) => setForm({ ...form, consentPublicStory: e.target.checked })} /> Exibir como história pública</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.consentShowName} onChange={(e) => setForm({ ...form, consentShowName: e.target.checked })} /> Exibir nome e CRMV</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={saving || !form.reporterName.trim() || !form.attribution.trim()} onClick={save}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- telas (credenciais de exibição)

function ScreensDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tokens, setTokens] = useState<DisplayToken[]>([]);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<{ label: string; link: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setTokens(await livesSavedService.displayTokens());
    } catch (err) {
      toast.error('Erro ao carregar telas', { description: getErrorMessage(err) });
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function create() {
    if (!label.trim()) return;
    setBusy(true);
    try {
      const t = await livesSavedService.createDisplayToken(label.trim());
      setFresh({ label: t.label, link: `${window.location.origin}/display/vidas?token=${t.token}` });
      setLabel('');
      load();
    } catch (err) {
      toast.error('Não foi possível gerar', { description: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(t: DisplayToken) {
    if (!window.confirm(`Revogar "${t.label}"? A TV que usa esse link para de atualizar.`)) return;
    try {
      await livesSavedService.revokeDisplayToken(t.id);
      load();
    } catch (err) {
      toast.error('Não foi possível revogar', { description: getErrorMessage(err) });
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link copiado');
    } catch {
      toast.error('Copie manualmente');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setFresh(null); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Telas corporativas</DialogTitle>
          <DialogDescription>
            Cada TV recebe um link próprio, válido só pra ler o contador. Abra o link uma vez na TV (Chrome em modo quiosque:
            <code className="ml-1 text-xs">chrome --kiosk &lt;link&gt;</code>). O token aparece uma única vez.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input placeholder="Nome da tela (ex.: Recepção)" value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          <Button disabled={busy || !label.trim()} onClick={create}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gerar link'}
          </Button>
        </div>

        {fresh && (
          <div className="rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 space-y-2">
            <div className="text-sm font-medium">Link de &ldquo;{fresh.label}&rdquo; &mdash; copie agora, ele não aparece de novo.</div>
            <div className="flex gap-2 items-center">
              <code className="text-xs break-all flex-1">{fresh.link}</code>
              <Button size="sm" variant="outline" onClick={() => copy(fresh.link)}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
              </Button>
            </div>
          </div>
        )}

        {tokens.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500 border-b">
              <tr><th className="py-2">Tela</th><th className="py-2">Criada</th><th className="py-2">Último acesso</th><th className="py-2"></th></tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id} className={`border-b last:border-0 ${t.revokedAt ? 'opacity-50' : ''}`}>
                  <td className="py-2 font-medium">{t.label}{t.revokedAt && <Badge variant="outline" className="ml-2">revogada</Badge>}</td>
                  <td className="py-2 text-gray-500">{fmt(t.createdAt)} · {t.createdBy.name}</td>
                  <td className="py-2 text-gray-500">{t.lastSeenAt ? new Date(t.lastSeenAt).toLocaleString('pt-BR') : 'nunca'}</td>
                  <td className="py-2 text-right">
                    {!t.revokedAt && (
                      <Button size="sm" variant="ghost" onClick={() => revoke(t)}><X className="h-4 w-4 mr-1" /> Revogar</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DialogContent>
    </Dialog>
  );
}
