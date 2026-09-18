'use client';

/**
 * Mural de vidas: um ponto por vida salva. Azul = história pública (abre),
 * cinza = relato privado (conta, não abre), âmbar = aprovado esta semana,
 * anel = meu relato. Tokens Atlas (docs/atlas/DESIGN_SYSTEM.md).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeartPulse, Plus } from 'lucide-react';
import {
  AtlasButton,
  AtlasCard,
  AtlasEmptyState,
  AtlasLoadingBar,
  AtlasPageHeader,
} from '@/components/atlas';
import { AnimatedCounter } from '@/components/lives-saved/AnimatedCounter';
import { compactDate } from '@/components/lives-saved/format';
import { livesSavedService } from '@/lib/api/lives-saved.service';
import { SPECIES_LABEL, type StoryCard, type WallDot } from '@/lib/types/lives-saved.types';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

const WEEK = 7 * 86_400_000;

export default function LivesSavedWallPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [dots, setDots] = useState<WallDot[]>([]);
  const [recent, setRecent] = useState<StoryCard[]>([]);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [wall, stories] = await Promise.all([
          livesSavedService.wall(),
          livesSavedService.stories(undefined, 6),
        ]);
        if (cancelled) return;
        setTotal(wall.total);
        setDots(wall.dots);
        setRecent(stories.items);
      } catch (err) {
        logger.error('Erro ao carregar mural de vidas', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const last = dots.length ? dots[dots.length - 1].approvedAt : null;

  return (
    <>
      <AtlasPageHeader
        metaLabel="Comunidade"
        title="Vidas"
        titleEm="salvas"
        actions={
          <AtlasButton variant="primary" asChild>
            <Link href="/student/vidas/relatar">
              <Plus strokeWidth={1.5} /> Relatar uma vida salva
            </Link>
          </AtlasButton>
        }
      >
        <div className="pt-[14px] sm:pt-[18px] border-t border-atlas-line flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-serif text-[40px] sm:text-[48px] font-medium leading-none tracking-[-0.02em] text-atlas-ink atlas-num">
              {loading ? '…' : <AnimatedCounter value={total} />}
            </div>
            <div className="text-[12.5px] text-atlas-muted mt-2">
              relatos aprovados
              {last && (
                <>
                  {' '}· último em <span className="font-mono text-[11px] tracking-wide">{compactDate(last)}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-atlas-muted">
            <Legend className="bg-atlas-primary">história pública</Legend>
            <Legend className="bg-atlas-line-strong">relato privado</Legend>
            <Legend className="bg-atlas-warn">novos esta semana</Legend>
            <Legend className="bg-atlas-surface ring-[1.5px] ring-atlas-primary-2">meu relato</Legend>
          </div>
        </div>
      </AtlasPageHeader>

      <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-8">
        {loading ? (
          <AtlasLoadingBar />
        ) : total === 0 ? (
          <AtlasEmptyState
            icon={HeartPulse}
            title="Nenhuma vida salva registrada ainda"
            description="Cada ponto deste mural nasce de um relato escrito por um veterinário. O primeiro pode ser o seu."
            action={
              <AtlasButton variant="primary" asChild>
                <Link href="/student/vidas/relatar">Relatar uma vida salva</Link>
              </AtlasButton>
            }
          />
        ) : (
          <>
            <AtlasCard className="relative p-4 sm:p-[18px]">
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(18px, 1fr))' }}
                aria-label="Mural: um ponto por vida salva"
              >
                {dots.map((d) => {
                  const fresh = d.approvedAt && Date.now() - new Date(d.approvedAt).getTime() < WEEK;
                  const openable = d.isPublic || d.isMine;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      disabled={!openable}
                      aria-label={openable ? 'Abrir relato' : 'Relato privado'}
                      onClick={() => router.push(`/student/vidas/${d.id}`)}
                      onMouseEnter={(e) =>
                        openable &&
                        setTip({
                          x: e.clientX,
                          y: e.clientY,
                          text: `${d.species ? SPECIES_LABEL[d.species] : 'Espécie não informada'} · ${compactDate(d.approvedAt)}`,
                        })
                      }
                      onMouseMove={(e) => tip && setTip({ ...tip, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setTip(null)}
                      className={cn(
                        'aspect-square rounded-full transition-[transform,background-color] duration-150',
                        'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-atlas-primary',
                        !openable && 'bg-atlas-line-strong cursor-default',
                        openable && !fresh && 'bg-atlas-primary hover:bg-atlas-primary-2 hover:scale-125',
                        openable && fresh && 'bg-atlas-warn hover:bg-atlas-warn-deep hover:scale-125',
                        d.isMine && 'ring-[1.5px] ring-atlas-primary-2 ring-offset-2 ring-offset-atlas-surface',
                      )}
                    />
                  );
                })}
              </div>
              {tip && (
                <div
                  className="fixed z-50 pointer-events-none bg-atlas-surface border border-atlas-line-strong rounded-sm px-2.5 py-1.5 text-xs text-atlas-ink"
                  style={{ left: tip.x + 12, top: tip.y + 12 }}
                >
                  {tip.text}
                </div>
              )}
            </AtlasCard>

            <section>
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-serif text-[17px] font-medium tracking-[-0.005em] text-atlas-ink">
                  Relatos recentes
                </h3>
                <Link href="/student/vidas/relatar" className="text-[12.5px] font-medium text-atlas-primary-2">
                  meus relatos
                </Link>
              </div>
              {recent.length === 0 ? (
                <p className="text-sm text-atlas-muted">
                  Ainda não há histórias públicas. Os relatos contam no número mesmo sem serem exibidos.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recent.map((s) => (
                    <StoryCardItem key={s.id} story={s} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

function Legend({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className={cn('inline-block size-2.5 rounded-full', className)} />
      {children}
    </span>
  );
}

function StoryCardItem({ story }: { story: StoryCard }) {
  return (
    <Link
      href={`/student/vidas/${story.id}`}
      className="block bg-atlas-surface border border-atlas-line rounded-md p-4 hover:bg-atlas-surface-2 transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-atlas-primary"
    >
      <div className="flex items-center gap-2 text-atlas-muted mb-2">
        {story.species && (
          <span className="atlas-caps text-[10px] px-1.5 py-[3px] rounded-sm bg-atlas-primary-soft text-atlas-primary-2">
            {SPECIES_LABEL[story.species]}
          </span>
        )}
        <span className="font-mono text-[10.5px] tracking-wide">{compactDate(story.occurredAt ?? story.approvedAt)}</span>
        {story.isMine && <span className="atlas-caps text-[10px] text-atlas-primary-2">meu</span>}
      </div>
      <p className="font-serif text-[15px] leading-[1.45] text-atlas-ink line-clamp-3">“{story.excerpt}”</p>
      <div className="mt-2 text-[12.5px] text-atlas-muted">
        <span className="text-atlas-ink font-medium">{story.reporterDisplay}</span>
        {story.reporterCrmv && (
          <>
            {' '}· <span className="font-mono text-[11px] tracking-wide">{story.reporterCrmv}</span>
          </>
        )}
      </div>
    </Link>
  );
}
