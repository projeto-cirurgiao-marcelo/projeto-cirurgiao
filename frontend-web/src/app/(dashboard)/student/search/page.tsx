'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PlayCircle, Search } from 'lucide-react';
import {
  coursesService,
  type CatalogSearchResult,
} from '@/lib/api/courses.service';
import {
  AtlasCourseCard,
  AtlasEmptyState,
  AtlasLoadingBar,
  AtlasPageHeader,
  type AtlasCourseThumbVariant,
} from '@/components/atlas';
import { logger } from '@/lib/logger';

const THUMB_VARIANTS: AtlasCourseThumbVariant[] = [
  'default',
  'alt',
  'alt2',
  'alt3',
  'alt4',
];

function pickThumbVariant(id: string): AtlasCourseThumbVariant {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return THUMB_VARIANTS[Math.abs(hash) % THUMB_VARIANTS.length];
}

function formatDuration(totalSeconds: number): string | null {
  if (!totalSeconds || totalSeconds <= 0) return null;
  const m = Math.round(totalSeconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();

  const [results, setResults] = useState<CatalogSearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults({ courses: [], videos: [] });
      return;
    }
    let cancelled = false;
    setLoading(true);
    coursesService
      .searchCatalog(query)
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch((err) => {
        logger.error('Erro na busca do catálogo:', err);
        if (!cancelled) setResults({ courses: [], videos: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const courses = results?.courses ?? [];
  const videos = results?.videos ?? [];
  const isEmpty = !loading && results !== null && courses.length === 0 && videos.length === 0;

  return (
    <>
      <AtlasPageHeader
        metaLabel="Biblioteca · Busca"
        title="Resultados para"
        titleEm={query ? `"${query}"` : 'sua busca'}
      />

      <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-8">
        {loading && <AtlasLoadingBar />}

        {query.length < 2 && !loading && (
          <AtlasEmptyState
            icon={Search}
            title="Digite pelo menos 2 caracteres"
            description="Use a barra de busca no topo para encontrar cursos e aulas."
          />
        )}

        {isEmpty && query.length >= 2 && (
          <AtlasEmptyState
            icon={Search}
            title="Nenhum resultado encontrado"
            description={`Nenhum curso ou aula corresponde a "${query}". Tente outros termos.`}
          />
        )}

        {courses.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Cursos ({courses.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px] sm:gap-[18px]">
              {courses.map((course) => (
                <AtlasCourseCard
                  key={course.id}
                  href={`/student/courses/${course.id}`}
                  title={course.title}
                  category="Cirurgia veterinária"
                  instructor={course.instructor?.name}
                  lessonsCount={course.lessonsCount}
                  status="new"
                  thumbVariant={pickThumbVariant(course.id)}
                  thumbImageUrl={
                    course.thumbnailHorizontal ||
                    course.thumbnailVertical ||
                    course.thumbnail ||
                    undefined
                  }
                />
              ))}
            </div>
          </section>
        )}

        {videos.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Aulas ({videos.length})
            </h2>
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {videos.map((video) => (
                <li key={`${video.courseId}-${video.id}`}>
                  <Link
                    href={`/student/courses/${video.courseId}/watch/${video.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <PlayCircle
                      className="size-5 shrink-0 text-muted-foreground"
                      strokeWidth={1.75}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{video.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {video.courseTitle} · {video.moduleTitle}
                      </p>
                    </div>
                    {formatDuration(video.duration) && (
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {formatDuration(video.duration)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

export default function SearchPage() {
  // useSearchParams exige Suspense boundary no App Router
  return (
    <Suspense fallback={<AtlasLoadingBar className="m-7" />}>
      <SearchResults />
    </Suspense>
  );
}
