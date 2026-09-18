'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, HeartPulse } from 'lucide-react';
import { AtlasButton, AtlasCard, AtlasEmptyState, AtlasLoadingBar } from '@/components/atlas';
import { compactDate } from '@/components/lives-saved/format';
import { livesSavedService } from '@/lib/api/lives-saved.service';
import { SPECIES_LABEL, STATUS_LABEL, type Story } from '@/lib/types/lives-saved.types';
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
              <Link href="/student/vidas">Voltar ao mural</Link>
            </AtlasButton>
          }
        />
      </div>
    );
  }

  const title = story.procedureSummary?.trim() || (story.species ? `Vida salva · ${SPECIES_LABEL[story.species]}` : 'Vida salva');
  const initials = story.reporterDisplay
    .replace(/^Dr[a]?\.\s*/, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="px-5 sm:px-7 py-5 sm:py-6">
      <Link
        href="/student/vidas"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-atlas-primary-2 mb-4"
      >
        <ArrowLeft className="size-3.5" strokeWidth={1.5} /> Mural de vidas
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,64ch)_256px] gap-8 items-start">
        <article>
          <div className="atlas-caps text-atlas-muted">
            {story.species ? SPECIES_LABEL[story.species] : 'Espécie não informada'}
            {story.occurredAt && (
              <>
                {' '}· <span className="font-mono normal-case tracking-wide">{compactDate(story.occurredAt)}</span>
              </>
            )}
            {story.isMine && story.status !== 'APPROVED' && (
              <>
                {' '}· <span className="text-atlas-warn-deep">{STATUS_LABEL[story.status]}</span>
              </>
            )}
          </div>
          <h2 className="font-serif text-[22px] font-medium tracking-[-0.01em] leading-[1.2] text-atlas-ink mt-1.5 mb-3 text-balance">
            {title}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {story.animalName && <Chip primary>{story.animalName}</Chip>}
            {story.impactType && <Chip>Impacto {story.impactType === 'DIRECT' ? 'direto' : 'indireto'}</Chip>}
          </div>

          {story.isMine && story.status === 'REJECTED' && story.rejectionReason && (
            <div className="mt-4 border border-atlas-warn rounded-md px-4 py-3 text-sm text-atlas-ink">
              <div className="atlas-caps text-atlas-warn-deep mb-1">Devolvido pela moderação</div>
              {story.rejectionReason}
              <div className="mt-2">
                <Link href={`/student/vidas/relatar?id=${story.id}`} className="text-atlas-primary-2 font-medium">
                  Editar e reenviar
                </Link>
              </div>
            </div>
          )}

          <div className="atlas-caps text-atlas-muted mt-6 mb-2">{QUESTION}</div>
          <div className="font-serif text-[16px] leading-[1.65] text-atlas-ink whitespace-pre-wrap">
            {story.attribution}
          </div>

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

          <div className="mt-7 flex gap-2">
            <AtlasButton variant="primary" asChild>
              <Link href="/student/vidas/relatar">Relatar minha experiência</Link>
            </AtlasButton>
            <AtlasButton asChild>
              <Link href="/student/vidas">Ver outras histórias</Link>
            </AtlasButton>
          </div>
        </article>

        <AtlasCard className="p-4 flex flex-col gap-2.5 lg:sticky lg:top-3">
          <div className="size-10 rounded-full bg-atlas-primary-soft text-atlas-primary-2 grid place-items-center font-semibold text-[13px]">
            {initials || '?'}
          </div>
          <div>
            <div className="font-medium text-atlas-ink">{story.reporterDisplay}</div>
            {story.reporterTitle && <div className="text-[12.5px] text-atlas-muted">{story.reporterTitle}</div>}
          </div>
          {story.reporterCrmv && (
            <div className="font-mono text-[11px] tracking-wide text-atlas-muted">{story.reporterCrmv}</div>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px] text-atlas-muted border-t border-atlas-line pt-2.5">
            <dt>Espécie</dt>
            <dd className="text-atlas-ink">{story.species ? SPECIES_LABEL[story.species] : '—'}</dd>
            <dt>Data do caso</dt>
            <dd className="text-atlas-ink font-mono text-[11px]">{compactDate(story.occurredAt) || '—'}</dd>
            <dt>Mídia</dt>
            <dd className="text-atlas-ink">{story.media.length ? `${story.media.length} arquivo(s)` : 'nenhuma'}</dd>
          </dl>
        </AtlasCard>
      </div>
    </div>
  );
}

function Chip({ children, primary }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <span
      className={
        primary
          ? 'atlas-caps text-[10px] px-1.5 py-[3px] rounded-sm bg-atlas-primary-soft text-atlas-primary-2'
          : 'atlas-caps text-[10px] px-1.5 py-[3px] rounded-sm bg-atlas-surface-2 text-atlas-muted'
      }
    >
      {children}
    </span>
  );
}
