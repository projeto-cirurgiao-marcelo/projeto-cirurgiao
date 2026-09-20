'use client';

/**
 * Registro de vidas salvas (direção C, 20/09): um livro de registro. Cada
 * vida é uma linha com nº de ordem, data, espécie e procedimento. Relato
 * privado conta, aparece em itálico e não abre. Tokens Atlas.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeartPulse, Plus } from 'lucide-react';
import { AtlasButton, AtlasCard, AtlasEmptyState, AtlasLoadingBar, AtlasPageHeader } from '@/components/atlas';
import { AnimatedCounter } from '@/components/lives-saved/AnimatedCounter';
import { compactDate } from '@/components/lives-saved/format';
import { livesSavedService } from '@/lib/api/lives-saved.service';
import { padSeq, SPECIES_LABEL, type LifeSavedSummary, type WallEntry } from '@/lib/types/lives-saved.types';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

const PAGE = 25;
const WEEK = 7 * 86_400_000;

export default function LivesSavedRegistryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<WallEntry[]>([]);
  const [summary, setSummary] = useState<LifeSavedSummary | null>(null);
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [wall, s] = await Promise.all([livesSavedService.wall(), livesSavedService.summary()]);
        if (cancelled) return;
        setEntries(wall.entries);
        setSummary(s);
      } catch (err) {
        logger.error('Erro ao carregar registro de vidas', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = summary?.total ?? entries.length;

  return (
    <>
      <AtlasPageHeader
        metaLabel="Comunidade"
        title="Registro de"
        titleEm="vidas salvas"
        actions={
          <AtlasButton variant="primary" asChild>
            <Link href="/student/vidas/relatar">
              <Plus strokeWidth={1.5} /> Registrar uma vida salva
            </Link>
          </AtlasButton>
        }
      >
        <div className="pt-[14px] sm:pt-[18px] border-t border-atlas-line flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <div className="font-mono text-[44px] sm:text-[56px] font-medium leading-none tracking-[-0.02em] text-atlas-ink atlas-num">
            <span className="text-[14px] tracking-[0.08em] text-atlas-muted align-middle mr-2">Nº</span>
            {loading ? '····' : <AnimatedCounter value={total} pad={4} />}
          </div>
          <div className="text-[13px] text-atlas-muted">
            relatos aprovados
            {summary && summary.newThisWeek > 0 && (
              <>
                {' '}· <span className="font-mono text-[11px] tracking-wide text-atlas-warn-deep">+{summary.newThisWeek} esta semana</span>
              </>
            )}
          </div>
        </div>
      </AtlasPageHeader>

      <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-6">
        {loading ? (
          <AtlasLoadingBar />
        ) : entries.length === 0 ? (
          <AtlasEmptyState
            icon={HeartPulse}
            title="O registro ainda está vazio"
            description="Cada linha deste livro nasce de um relato escrito por um veterinário. A primeira pode ser a sua."
            action={
              <AtlasButton variant="primary" asChild>
                <Link href="/student/vidas/relatar">Registrar uma vida salva</Link>
              </AtlasButton>
            }
          />
        ) : (
          <AtlasCard className="overflow-x-auto">
            <div className="min-w-[640px] text-[13px]">
              <div className="grid grid-cols-[56px_88px_84px_1fr_auto] gap-3 px-4 py-2 border-b border-atlas-line-strong atlas-caps text-atlas-muted">
                <span>nº</span><span>data</span><span>espécie</span><span>procedimento</span><span className="text-right">responsável</span>
              </div>
              {entries.slice(0, shown).map((e) => {
                const openable = e.isPublic || e.isMine;
                const fresh = e.approvedAt && Date.now() - new Date(e.approvedAt).getTime() < WEEK;
                const Row = openable ? 'button' : 'div';
                return (
                  <Row
                    key={e.id}
                    type={openable ? 'button' : undefined}
                    onClick={openable ? () => router.push(`/student/vidas/${e.id}`) : undefined}
                    className={cn(
                      'grid grid-cols-[56px_88px_84px_1fr_auto] gap-3 items-baseline w-full text-left px-4 py-2 border-b border-atlas-line last:border-0 transition-colors duration-150',
                      openable && 'hover:bg-atlas-surface-2 cursor-pointer',
                      'outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-atlas-primary',
                    )}
                  >
                    <span className={cn('font-mono text-[11px] tracking-wide', fresh ? 'text-atlas-warn-deep' : 'text-atlas-muted-2')}>{padSeq(e.seq)}</span>
                    <span className="font-mono text-[11px] tracking-wide text-atlas-muted">{compactDate(e.occurredAt ?? e.approvedAt)}</span>
                    <span className="text-atlas-muted">{e.species ? SPECIES_LABEL[e.species] : '—'}</span>
                    {openable ? (
                      <span className="font-serif text-[15px] text-atlas-ink">
                        {e.procedureSummary || 'Ver relato'}
                        {e.isMine && <span className="atlas-caps text-[10px] text-atlas-primary-2 ml-2">meu</span>}
                      </span>
                    ) : (
                      <span className="italic text-atlas-muted-2">relato privado · conta, não abre</span>
                    )}
                    <span className="text-[12px] text-atlas-muted text-right whitespace-nowrap">{e.reporterDisplay ?? (openable ? 'Médico(a) veterinário(a)' : '—')}</span>
                  </Row>
                );
              })}
              {entries.length > shown && (
                <button type="button" onClick={() => setShown((n) => n + PAGE)} className="px-4 py-2.5 text-[12.5px] font-medium text-atlas-primary-2">
                  ver as {entries.length - shown} anteriores →
                </button>
              )}
            </div>
          </AtlasCard>
        )}
      </div>
    </>
  );
}
