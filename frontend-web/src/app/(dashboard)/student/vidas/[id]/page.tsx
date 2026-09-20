'use client';

/** Ficha de uma vida salva (direção C): nº de ordem, carimbo, ficha de quatro campos, relato, assinatura. */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, HeartPulse } from 'lucide-react';
import { AtlasButton, AtlasEmptyState, AtlasLoadingBar } from '@/components/atlas';
import { compactDate } from '@/components/lives-saved/format';
import { livesSavedService } from '@/lib/api/lives-saved.service';
import { padSeq, SPECIES_LABEL, STATUS_LABEL, type Story } from '@/lib/types/lives-saved.types';
import { logger } from '@/lib/logger';

const QUESTION = 'Por que você atribui essa vida salva a algo que aprendeu no Projeto Cirurgião?';

export default function LifeSavedStoryPage() {
  const { id } = useParams<{ id: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading');

  useEffect(() => {
    let cancelled = false;
    livesSavedService
      .story(id)
      .then((s) => {
        if (cancelled) return;
        setStory(s);
        setState('ok');
      })
      .catch((err) => {
        logger.error('Erro ao carregar relato', err);
        if (!cancelled) setState('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state === 'loading') return <AtlasLoadingBar className="m-7" />;
  if (state === 'missing' || !story) {
    return (
      <div className="px-5 sm:px-7 py-6">
        <AtlasEmptyState
          icon={HeartPulse}
          title="Relato não encontrado"
          description="Ele pode ter sido removido ou o autor não autorizou a exibição."
          action={
            <AtlasButton asChild>
              <Link href="/student/vidas">Voltar ao registro</Link>
            </AtlasButton>
          }
        />
      </div>
    );
  }

  const approved = story.status === 'APPROVED';
  const speciesLine = [story.species ? SPECIES_LABEL[story.species] : null, story.animalName].filter(Boolean).join(' · ') || '—';
  const signature = [story.reporterDisplay, story.reporterTitle].filter(Boolean).join(', ');

  return (
    <div className="px-5 sm:px-7 py-5 sm:py-6">
      <Link href="/student/vidas" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-atlas-primary-2 mb-4">
        <ArrowLeft className="size-3.5" strokeWidth={1.5} /> Registro de vidas salvas
      </Link>

      <article className="max-w-[72ch]">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="font-mono text-[28px] font-medium tracking-[-0.02em] text-atlas-ink atlas-num">
            <span className="text-[12px] tracking-[0.08em] text-atlas-muted align-middle mr-2">Nº</span>
            {approved ? padSeq(story.seq) : '····'}
          </div>
          {approved ? (
            <span className="inline-block border-[1.5px] border-atlas-success text-atlas-success rounded-sm px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase font-semibold -rotate-2">
              Aprovado · {compactDate(story.approvedAt)}
            </span>
          ) : (
            story.isMine && <span className="atlas-caps text-atlas-warn-deep">{STATUS_LABEL[story.status]}</span>
          )}
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 border border-atlas-line-strong rounded-sm my-3 divide-x divide-atlas-line [&>div]:px-2.5 [&>div]:py-2">
          <Field label="Espécie" value={speciesLine} />
          <Field label="Procedimento" value={story.procedureSummary || '—'} />
          <Field label="Data do caso" value={story.occurredAt ? story.occurredAt.slice(0, 10) : '—'} mono />
          <Field label="Responsável" value={story.reporterCrmv ?? 'CRMV reservado'} mono />
        </dl>

        {story.isMine && story.status === 'REJECTED' && story.rejectionReason && (
          <div className="mt-3 mb-4 border border-atlas-warn rounded-md px-4 py-3 text-sm text-atlas-ink">
            <div className="atlas-caps text-atlas-warn-deep mb-1">Devolvido pela moderação</div>
            {story.rejectionReason}
            <div className="mt-2">
              <Link href={`/student/vidas/relatar?id=${story.id}`} className="text-atlas-primary-2 font-medium">Editar e reenviar</Link>
            </div>
          </div>
        )}

        <div className="atlas-caps text-atlas-muted mt-5 mb-2">{QUESTION}</div>
        <div className="font-serif text-[16px] leading-[1.65] text-atlas-ink whitespace-pre-wrap">{story.attribution}</div>

        {story.media.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-5">
            {story.media.map((m) =>
              m.kind === 'VIDEO' ? (
                <video key={m.id} src={m.url} controls preload="metadata" className="w-full rounded-md bg-black aspect-[4/3] object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={m.id} src={m.url} alt={m.caption ?? ''} className="w-full rounded-md border border-atlas-line aspect-[4/3] object-cover" />
              ),
            )}
          </div>
        )}

        <p className="mt-5 text-[12.5px] text-atlas-muted border-t border-atlas-line pt-3">
          Assinado por <span className="text-atlas-ink font-medium">{signature || 'Médico(a) veterinário(a)'}</span>
          {story.reporterCrmv && (
            <>
              {' '}· <span className="font-mono text-[11px] tracking-wide">{story.reporterCrmv}</span>
            </>
          )}
          .
        </p>

        <div className="mt-6 flex gap-2">
          <AtlasButton variant="primary" asChild>
            <Link href="/student/vidas/relatar">Registrar minha experiência</Link>
          </AtlasButton>
          <AtlasButton asChild>
            <Link href="/student/vidas">Ver o registro</Link>
          </AtlasButton>
        </div>
      </article>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] tracking-[0.1em] uppercase text-atlas-muted-2 mb-0.5">{label}</dt>
      <dd className={mono ? 'font-mono text-[12px] text-atlas-ink truncate' : 'text-[13px] text-atlas-ink truncate'}>{value}</dd>
    </div>
  );
}
