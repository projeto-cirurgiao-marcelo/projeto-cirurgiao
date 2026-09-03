'use client';

/**
 * Aulas de uma vitrine. A vitrine é camada de permissão, não de navegação —
 * esta página é só o índice; o play cai no watch normal do curso de origem.
 *
 * Dois modos:
 * - possuída ("Meus Cursos"): índice do que foi comprado.
 * - bloqueada (`?locked=1`, vinda de "Continue evoluindo"): mesmo índice,
 *   com aviso de prévia e CTA de checkout. No watch, o gate do vídeo corta
 *   em `previewSeconds` e oferece a vitrine. Espelha a tela do mobile.
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { showcasesService } from '@/lib/api/showcases.service';
import type { AvailableShowcaseDetail, MyShowcaseDetail } from '@/lib/types/showcase.types';
import { ArrowLeft, ArrowUpRight, Circle, Lock, PlayCircle, Video } from 'lucide-react';
import {
  AtlasButton,
  AtlasEmptyState,
  AtlasLoadingBar,
  AtlasPageHeader,
  AtlasStatsInline,
} from '@/components/atlas';
import { logger } from '@/lib/logger';

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

type ShowcaseDetail = MyShowcaseDetail | AvailableShowcaseDetail;

function ShowcasePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const locked = searchParams.get('locked') === '1';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const [showcase, setShowcase] = useState<ShowcaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    const request: Promise<ShowcaseDetail> = locked
      ? showcasesService.availableShowcaseDetail(slug)
      : showcasesService.myShowcaseDetail(slug);
    request
      .then(setShowcase)
      .catch((err) => {
        logger.error('Erro ao carregar vitrine:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, hasHydrated, slug, locked, router]);

  if (!hasHydrated || loading) {
    return (
      <main className="px-7 py-7">
        <AtlasLoadingBar />
      </main>
    );
  }

  if (error || !showcase) {
    return (
      <main className="px-7 py-10 max-w-3xl mx-auto">
        <AtlasEmptyState
          icon={Video}
          title="Curso não encontrado"
          description={
            locked
              ? 'Este curso não está disponível no momento.'
              : 'Este conteúdo não está disponível na sua conta.'
          }
          action={
            <AtlasButton variant="outline" size="md" onClick={() => router.push('/student/courses')}>
              <ArrowLeft strokeWidth={1.75} />
              Voltar aos cursos
            </AtlasButton>
          }
        />
      </main>
    );
  }

  const checkoutUrl =
    locked && 'checkoutUrl' in showcase ? showcase.checkoutUrl : null;
  const totalSeconds = showcase.videos.reduce((sum, v) => sum + (v.duration || 0), 0);
  const totalHours = totalSeconds > 0 ? `${Math.max(1, Math.round(totalSeconds / 3600))}h` : '—';

  return (
    <>
      <AtlasPageHeader
        metaLabel={locked ? 'Prévia do curso' : 'Meus Cursos'}
        title={showcase.title}
        actions={
          <AtlasButton
            variant="outline"
            size="md"
            onClick={() => router.push('/student/courses')}
          >
            <ArrowLeft strokeWidth={1.75} />
            Voltar aos cursos
          </AtlasButton>
        }
      >
        <AtlasStatsInline
          stats={[
            { value: String(showcase.videos.length), label: 'Aulas' },
            { value: totalHours, format: 'mono', label: 'Duração total' },
          ]}
        />
      </AtlasPageHeader>

      <div className="px-5 sm:px-7 py-5 sm:py-6 max-w-4xl">
        {locked && (
          <div className="mb-6 bg-atlas-surface border border-atlas-primary/30 rounded-md p-4 sm:p-5 flex gap-3.5 items-start">
            <div className="size-9 rounded-full bg-atlas-primary/10 flex items-center justify-center shrink-0">
              <Lock className="size-4 text-atlas-primary-2" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-[15px] font-medium tracking-[-0.005em] text-atlas-ink">
                Você ainda não tem acesso a este curso
              </h2>
              <p className="text-atlas-muted text-[13px] leading-[1.55] mt-1 max-w-2xl">
                Assista a uma prévia de cada aula para conhecer o conteúdo. Desbloqueie para ter
                acesso completo.
              </p>
              {checkoutUrl ? (
                <AtlasButton variant="primary" size="md" asChild className="mt-3">
                  <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                    Desbloquear curso
                    <ArrowUpRight strokeWidth={2} />
                  </a>
                </AtlasButton>
              ) : (
                <p className="text-atlas-muted text-[12.5px] mt-2">
                  Em breve — este curso ainda não está à venda.
                </p>
              )}
            </div>
          </div>
        )}

        {showcase.description && (
          <p className="text-atlas-muted text-[13.5px] leading-[1.55] mb-6 max-w-2xl">
            {showcase.description}
          </p>
        )}

        {showcase.videos.length === 0 ? (
          <AtlasEmptyState
            icon={Video}
            title="Nenhuma aula disponível"
            description="As aulas deste curso ainda estão sendo preparadas."
          />
        ) : (
          <ul className="bg-atlas-surface border border-atlas-line rounded-md overflow-hidden divide-y divide-atlas-line">
            {showcase.videos.map((video, index) => (
              <li key={video.id}>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/student/courses/${video.courseId}/watch/${video.id}`)
                  }
                  className="w-full text-left grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 transition-colors hover:bg-atlas-surface-2"
                >
                  <PlayCircle
                    className="size-5 text-atlas-primary-2 shrink-0"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="atlas-mono text-[10px] text-atlas-muted-2 tracking-[0.05em] uppercase mb-0.5">
                      Aula {String(index + 1).padStart(2, '0')}
                    </div>
                    <h3 className="font-serif text-[15px] font-medium tracking-[-0.005em] leading-[1.3] text-atlas-ink line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-[11.5px] text-atlas-muted mt-0.5 truncate">
                      {video.moduleTitle} · {video.courseTitle}
                    </p>
                  </div>
                  {locked ? (
                    <span className="shrink-0 rounded-full bg-atlas-primary/10 text-atlas-primary-2 text-[11px] font-medium px-2.5 py-0.5">
                      Prévia
                    </span>
                  ) : (
                    <div className="atlas-mono text-[11.5px] text-atlas-muted shrink-0 flex items-center gap-1.5 atlas-num">
                      <Circle
                        className="size-1 fill-atlas-muted-2 stroke-atlas-muted-2"
                        aria-hidden
                      />
                      {formatDuration(video.duration)}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/** `useSearchParams` exige Suspense no App Router (Next 15). */
export default function MyShowcasePage() {
  return (
    <Suspense
      fallback={
        <main className="px-7 py-7">
          <AtlasLoadingBar />
        </main>
      }
    >
      <ShowcasePage />
    </Suspense>
  );
}
