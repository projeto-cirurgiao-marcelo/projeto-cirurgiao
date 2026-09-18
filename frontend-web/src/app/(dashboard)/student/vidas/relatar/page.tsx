'use client';

/**
 * Formulário de relato + "meus relatos". Obrigatórios: nome, CRMV e a
 * atribuição (sem limite). O rascunho existe no backend desde a abertura
 * (?id=) e é salvo a cada mudança, então mídia pode ser anexada antes de
 * enviar e nada se perde se a aba fechar.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Trash2, Upload } from 'lucide-react';
import { AtlasButton, AtlasCard, AtlasLoadingBar, AtlasPageHeader } from '@/components/atlas';
import { Checkbox } from '@/components/ui/checkbox';
import { compactDate } from '@/components/lives-saved/format';
import { livesSavedService, MEDIA_ACCEPT } from '@/lib/api/lives-saved.service';
import { getErrorMessage } from '@/lib/api/client';
import {
  SPECIES_LABEL,
  STATUS_LABEL,
  type AnimalSpecies,
  type LifeSavedImpact,
  type MediaKind,
  type ReportInput,
  type Story,
} from '@/lib/types/lives-saved.types';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

const QUESTION = 'Por que você atribui essa vida salva a algo que aprendeu no Projeto Cirurgião?';

export default function ReportPage() {
  return (
    <Suspense fallback={<AtlasLoadingBar className="m-7" />}>
      <ReportPageInner />
    </Suspense>
  );
}

function ReportPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');
  const [report, setReport] = useState<Story | null>(null);
  const [mine, setMine] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMine = useCallback(async () => {
    try {
      setMine(await livesSavedService.mine());
    } catch (err) {
      logger.error('Erro ao carregar meus relatos', err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (id) {
          const s = await livesSavedService.story(id);
          if (!cancelled) setReport(s);
        } else {
          setReport(null);
        }
        await loadMine();
      } catch (err) {
        toast.error('Não foi possível abrir o relato', { description: getErrorMessage(err) });
        router.replace('/student/vidas/relatar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, loadMine, router]);

  async function startNew() {
    try {
      const draft = await livesSavedService.createDraft();
      router.push(`/student/vidas/relatar?id=${draft.id}`);
    } catch (err) {
      toast.error('Não foi possível iniciar o relato', { description: getErrorMessage(err) });
    }
  }

  return (
    <>
      <AtlasPageHeader
        metaLabel="Comunidade"
        title={report ? 'Relatar uma' : 'Meus'}
        titleEm={report ? 'vida salva' : 'relatos'}
        actions={
          report ? (
            <AtlasButton asChild>
              <Link href="/student/vidas/relatar">
                <ArrowLeft strokeWidth={1.5} /> Meus relatos
              </Link>
            </AtlasButton>
          ) : (
            <AtlasButton variant="primary" onClick={startNew}>
              Novo relato
            </AtlasButton>
          )
        }
      />
      <div className="px-5 sm:px-7 py-5 sm:py-6">
        {loading ? (
          <AtlasLoadingBar />
        ) : report ? (
          <ReportForm
            key={report.id}
            initial={report}
            onSubmitted={() => {
              loadMine();
              router.push(`/student/vidas/${report.id}`);
            }}
            onDeleted={() => {
              loadMine();
              router.push('/student/vidas/relatar');
            }}
          />
        ) : (
          <MyReports items={mine} onNew={startNew} />
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- lista

function MyReports({ items, onNew }: { items: Story[]; onNew: () => void }) {
  if (items.length === 0) {
    return (
      <AtlasCard className="px-6 py-10 text-center">
        <p className="font-serif text-[17px] text-atlas-ink mb-1">Você ainda não relatou nenhuma vida salva.</p>
        <p className="text-sm text-atlas-muted mb-5 max-w-[52ch] mx-auto">
          Só nome, CRMV e a sua explicação são obrigatórios. Fotos, vídeos e detalhes do caso são opcionais.
        </p>
        <AtlasButton variant="primary" onClick={onNew}>
          Começar
        </AtlasButton>
      </AtlasCard>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((s) => {
        const editable = s.status !== 'APPROVED';
        return (
          <Link
            key={s.id}
            href={editable ? `/student/vidas/relatar?id=${s.id}` : `/student/vidas/${s.id}`}
            className="block bg-atlas-surface border border-atlas-line rounded-md p-4 hover:bg-atlas-surface-2 transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span
                className={cn(
                  'atlas-caps text-[10px] px-1.5 py-[3px] rounded-sm',
                  s.status === 'APPROVED' && 'bg-atlas-primary-soft text-atlas-primary-2',
                  s.status === 'PENDING' && 'bg-atlas-surface-2 text-atlas-muted',
                  s.status === 'REJECTED' && 'border border-atlas-warn text-atlas-warn-deep',
                  s.status === 'DRAFT' && 'border border-atlas-line text-atlas-muted',
                )}
              >
                {STATUS_LABEL[s.status]}
              </span>
              <span className="font-mono text-[10.5px] tracking-wide text-atlas-muted">{compactDate(s.updatedAt)}</span>
            </div>
            <p className="font-serif text-[15px] leading-[1.45] text-atlas-ink line-clamp-3">
              {s.attribution ? `“${s.excerpt}”` : <span className="text-atlas-muted italic">Sem texto ainda</span>}
            </p>
            {s.status === 'REJECTED' && s.rejectionReason && (
              <p className="mt-2 text-xs text-atlas-warn-deep line-clamp-2">{s.rejectionReason}</p>
            )}
          </Link>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- form

type Form = Required<Pick<ReportInput, 'reporterName' | 'reporterCrmv' | 'attribution'>> &
  Omit<ReportInput, 'reporterName' | 'reporterCrmv' | 'attribution'>;

function fromStory(s: Story): Form {
  return {
    reporterName: s.reporterDisplay,
    reporterCrmv: s.reporterCrmv ?? '',
    reporterTitle: s.reporterTitle ?? '',
    attribution: s.attribution ?? '',
    species: s.species ?? undefined,
    speciesOther: s.speciesOther ?? '',
    animalName: s.animalName ?? '',
    occurredAt: s.occurredAt ? s.occurredAt.slice(0, 10) : '',
    procedureSummary: s.procedureSummary ?? '',
    impactType: s.impactType ?? undefined,
    consentPublicStory: s.consentPublicStory,
    consentShowName: s.consentShowName,
  };
}

function ReportForm({
  initial,
  onSubmitted,
  onDeleted,
}: {
  initial: Story;
  onSubmitted: () => void;
  onDeleted: () => void;
}) {
  const [form, setForm] = useState<Form>(() => fromStory(initial));
  const [media, setMedia] = useState(initial.media);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [uploads, setUploads] = useState<Record<string, number>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef<Partial<Form>>({});

  const canSubmit = form.reporterName.trim() && form.reporterCrmv.trim() && form.attribution.trim();

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    dirty.current[key] = value;
    setSaving('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  }

  async function flush(): Promise<boolean> {
    const patch = dirty.current;
    dirty.current = {};
    if (Object.keys(patch).length === 0) {
      setSaving('saved');
      return true;
    }
    // Strings vazias viram undefined (o backend guarda null onde couber).
    const body: ReportInput = Object.fromEntries(
      Object.entries(patch).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' && k !== 'attribution' ? undefined : v]),
    );
    try {
      await livesSavedService.update(initial.id, body);
      setSaving('saved');
      return true;
    } catch (err) {
      setSaving('error');
      toast.error('Não foi possível salvar', { description: getErrorMessage(err) });
      return false;
    }
  }

  async function handleSubmit() {
    if (timer.current) clearTimeout(timer.current);
    setSubmitting(true);
    try {
      if (!(await flush())) return;
      await livesSavedService.submit(initial.id);
      toast.success('Relato enviado', { description: 'Ele entra no contador assim que a moderação aprovar.' });
      onSubmitted();
    } catch (err) {
      toast.error('Não foi possível enviar', { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Excluir este relato?')) return;
    try {
      await livesSavedService.remove(initial.id);
      toast.success('Relato excluído');
      onDeleted();
    } catch (err) {
      toast.error('Não foi possível excluir', { description: getErrorMessage(err) });
    }
  }

  async function handleFiles(kind: MediaKind, files: FileList | null) {
    if (!files) return;
    const rule = MEDIA_ACCEPT[kind];
    for (const file of Array.from(files)) {
      if (!rule.mimes.includes(file.type)) {
        toast.error(`${file.name}: formato não aceito`);
        continue;
      }
      if (file.size > rule.maxBytes) {
        toast.error(`${file.name}: acima de ${Math.round(rule.maxBytes / 1048576)} MB`);
        continue;
      }
      const key = `${file.name}-${file.lastModified}`;
      setUploads((u) => ({ ...u, [key]: 0 }));
      try {
        await livesSavedService.uploadMedia(initial.id, file, kind, (pct) => setUploads((u) => ({ ...u, [key]: pct })));
        const fresh = await livesSavedService.story(initial.id);
        setMedia(fresh.media);
      } catch (err) {
        toast.error(`${file.name}: ${getErrorMessage(err)}`);
      } finally {
        setUploads((u) => {
          const { [key]: _drop, ...rest } = u;
          return rest;
        });
      }
    }
  }

  async function removeMedia(mediaId: string) {
    try {
      await livesSavedService.removeMedia(initial.id, mediaId);
      setMedia((m) => m.filter((x) => x.id !== mediaId));
    } catch (err) {
      toast.error('Não foi possível remover', { description: getErrorMessage(err) });
    }
  }

  const uploading = Object.keys(uploads).length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,72ch)_240px] gap-8 items-start">
      <div className="space-y-6">
        {initial.status === 'REJECTED' && initial.rejectionReason && (
          <div className="border border-atlas-warn rounded-md px-4 py-3 text-sm">
            <div className="atlas-caps text-atlas-warn-deep mb-1">Devolvido pela moderação</div>
            {initial.rejectionReason}
          </div>
        )}

        <Section title="Quem relata">
          <Field label="Nome completo" required>
            <input className={inputCls} value={form.reporterName} onChange={(e) => set('reporterName', e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="CRMV" required hint="Ex.: CRMV-SP 12345">
              <input className={cn(inputCls, 'font-mono')} value={form.reporterCrmv} onChange={(e) => set('reporterCrmv', e.target.value)} />
            </Field>
            <Field label="Cargo ou função" hint="opcional">
              <input className={inputCls} value={form.reporterTitle ?? ''} onChange={(e) => set('reporterTitle', e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title={QUESTION} required>
          <textarea
            className={cn(inputCls, 'min-h-[220px] font-serif text-[16px] leading-[1.6] resize-y')}
            placeholder="Conte o caso com as suas palavras. Não há limite de tamanho."
            value={form.attribution}
            onChange={(e) => set('attribution', e.target.value)}
          />
          <div className="text-[11px] font-mono text-atlas-muted-2 text-right">
            {form.attribution.trim() ? `${form.attribution.trim().split(/\s+/).length} palavras` : ''}
          </div>
        </Section>

        <Section title="Sobre o caso" hint="opcional">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Espécie">
              <select
                className={inputCls}
                value={form.species ?? ''}
                onChange={(e) => set('species', (e.target.value || undefined) as AnimalSpecies | undefined)}
              >
                <option value="">Não informar</option>
                {(Object.keys(SPECIES_LABEL) as AnimalSpecies[]).map((k) => (
                  <option key={k} value={k}>
                    {SPECIES_LABEL[k]}
                  </option>
                ))}
              </select>
            </Field>
            {form.species === 'OTHER' && (
              <Field label="Qual espécie?">
                <input className={inputCls} value={form.speciesOther ?? ''} onChange={(e) => set('speciesOther', e.target.value)} />
              </Field>
            )}
            <Field label="Nome do animal">
              <input className={inputCls} value={form.animalName ?? ''} onChange={(e) => set('animalName', e.target.value)} />
            </Field>
            <Field label="Data do caso">
              <input type="date" className={cn(inputCls, 'font-mono')} value={form.occurredAt ?? ''} onChange={(e) => set('occurredAt', e.target.value)} />
            </Field>
            <Field label="Procedimento em uma linha" hint="aparece nas listagens">
              <input className={inputCls} maxLength={160} value={form.procedureSummary ?? ''} onChange={(e) => set('procedureSummary', e.target.value)} />
            </Field>
            <Field label="Contribuição do Projeto">
              <select
                className={inputCls}
                value={form.impactType ?? ''}
                onChange={(e) => set('impactType', (e.target.value || undefined) as LifeSavedImpact | undefined)}
              >
                <option value="">Não informar</option>
                <option value="DIRECT">Direta (técnica aplicada no caso)</option>
                <option value="INDIRECT">Indireta (raciocínio, planejamento)</option>
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Fotos e vídeos" hint="opcional">
          <div className="flex flex-wrap gap-2">
            <UploadButton label="Adicionar fotos" accept={MEDIA_ACCEPT.PHOTO.mimes.join(',')} onFiles={(f) => handleFiles('PHOTO', f)} />
            <UploadButton label="Adicionar vídeos" accept={MEDIA_ACCEPT.VIDEO.mimes.join(',')} onFiles={(f) => handleFiles('VIDEO', f)} />
            <span className="self-center text-xs text-atlas-muted">
              até {MEDIA_ACCEPT.PHOTO.maxFiles} fotos de 15 MB e {MEDIA_ACCEPT.VIDEO.maxFiles} vídeos de 500 MB
            </span>
          </div>
          {(media.length > 0 || uploading) && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
              {media.map((m) => (
                <div key={m.id} className="relative group aspect-[4/3] rounded-md overflow-hidden border border-atlas-line bg-atlas-surface-2">
                  {m.kind === 'VIDEO' ? (
                    <video src={m.url} className="w-full h-full object-cover" muted preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(m.id)}
                    aria-label="Remover"
                    className="absolute top-1 right-1 size-7 rounded-sm bg-atlas-surface border border-atlas-line-strong grid place-items-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
              {Object.entries(uploads).map(([k, pct]) => (
                <div key={k} className="aspect-[4/3] rounded-md border border-dashed border-atlas-line grid place-items-center text-[11px] font-mono text-atlas-muted">
                  {pct}%
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Exibição">
          <label className="flex items-start gap-3 text-sm text-atlas-ink cursor-pointer">
            <Checkbox checked={!!form.consentPublicStory} onCheckedChange={(v) => set('consentPublicStory', v === true)} className="mt-0.5" />
            <span>
              Autorizo que este relato apareça como história no mural e na tela do Projeto Cirurgião.
              <span className="block text-xs text-atlas-muted">Sem marcar, ele conta no número mas fica visível só pra mim e pra moderação.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-atlas-ink cursor-pointer">
            <Checkbox checked={!!form.consentShowName} onCheckedChange={(v) => set('consentShowName', v === true)} className="mt-0.5" />
            <span>
              Autorizo exibir meu nome, cargo e CRMV junto ao relato.
              <span className="block text-xs text-atlas-muted">Sem marcar, aparece como “Médico(a) veterinário(a)”.</span>
            </span>
          </label>
        </Section>
      </div>

      <AtlasCard className="p-4 lg:sticky lg:top-3 space-y-3">
        <div className="text-xs text-atlas-muted">
          {saving === 'saving' && 'Salvando rascunho…'}
          {saving === 'saved' && 'Rascunho salvo'}
          {saving === 'error' && <span className="text-atlas-accent">Falha ao salvar</span>}
          {saving === 'idle' && `Rascunho de ${compactDate(initial.updatedAt)}`}
        </div>
        <ul className="text-[12.5px] space-y-1">
          <Req ok={!!form.reporterName.trim()}>Nome completo</Req>
          <Req ok={!!form.reporterCrmv.trim()}>CRMV</Req>
          <Req ok={!!form.attribution.trim()}>Sua explicação</Req>
        </ul>
        <AtlasButton variant="primary" className="w-full" disabled={!canSubmit || submitting || uploading} onClick={handleSubmit}>
          {submitting ? <Loader2 className="animate-spin" /> : null}
          {initial.status === 'REJECTED' ? 'Reenviar para moderação' : 'Enviar para moderação'}
        </AtlasButton>
        <p className="text-[11.5px] text-atlas-muted">O relato entra no contador depois da aprovação.</p>
        <AtlasButton variant="ghost" size="sm" className="w-full text-atlas-accent" onClick={handleDelete}>
          <Trash2 strokeWidth={1.5} /> Excluir rascunho
        </AtlasButton>
      </AtlasCard>
    </div>
  );
}

// ---------------------------------------------------------------- bits

const inputCls =
  'w-full bg-atlas-surface border border-atlas-line rounded-md px-3 py-2 text-sm text-atlas-ink placeholder:text-atlas-muted-2 outline-none focus-visible:border-atlas-ink-2 transition-colors';

function Section({ title, hint, required, children }: { title: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <AtlasCard className="p-5 space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-[17px] font-medium tracking-[-0.005em] text-atlas-ink text-balance">
          {title}
          {required && <span className="text-atlas-accent"> *</span>}
        </h3>
        {hint && <span className="atlas-caps text-atlas-muted-2 shrink-0">{hint}</span>}
      </div>
      {children}
    </AtlasCard>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="atlas-caps text-atlas-muted block mb-1.5">
        {label}
        {required && <span className="text-atlas-accent"> *</span>}
        {hint && <span className="normal-case tracking-normal text-atlas-muted-2"> · {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Req({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={cn('flex items-center gap-2', ok ? 'text-atlas-ink' : 'text-atlas-muted')}>
      <i className={cn('size-1.5 rounded-full', ok ? 'bg-atlas-success' : 'bg-atlas-line-strong')} />
      {children}
    </li>
  );
}

function UploadButton({ label, accept, onFiles }: { label: string; accept: string; onFiles: (f: FileList | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" multiple accept={accept} className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
      <AtlasButton size="sm" onClick={() => ref.current?.click()}>
        <Upload strokeWidth={1.5} /> {label}
      </AtlasButton>
    </>
  );
}
