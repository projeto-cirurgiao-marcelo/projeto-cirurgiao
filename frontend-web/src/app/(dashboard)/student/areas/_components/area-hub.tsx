'use client';

/**
 * Hub genérico de área ("Cirurgias de tecidos moles", "Ortopedia e
 * Neurocirurgias", ...) — layout do cliente (jul/2026): sequência de
 * seções carrossel/grid alimentadas pelos cursos do catálogo.
 * Matching por título de curso (mesma convenção da home) — se renomearem
 * cursos no admin, atualizar os matchers nas páginas de área.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useViewModeStore } from '@/lib/stores/view-mode-store';
import { coursesService } from '@/lib/api/courses.service';
import {
  AtlasEmptyState,
  AtlasLoadingBar,
  AtlasPageHeader,
} from '@/components/atlas';
import { BookOpen, PlayCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

interface HubVideo {
  id: string;
  title: string;
  isPublished?: boolean;
}

interface HubModule {
  id: string;
  title: string;
  order: number;
  parentModuleId?: string | null;
  thumbnail?: string | null;
  thumbnailHorizontal?: string | null;
  thumbnailVertical?: string | null;
  videos?: HubVideo[];
}

interface HubCourse {
  id: string;
  title: string;
  modules?: HubModule[];
}

export interface AreaSection {
  type: 'carousel' | 'grid';
  /** Título visível (o grid do sketch não tem) */
  title?: string;
  /** Curso-fonte, por título */
  courseMatch: RegExp;
  /** modules = módulos de topo; lessons = todas as aulas (cursos flat) */
  source: 'modules' | 'lessons';
}

export interface AreaHubProps {
  metaLabel: string;
  title: string;
  titleEm: string;
  sections: AreaSection[];
}

function topModules(course: HubCourse): HubModule[] {
  return (course.modules ?? [])
    .filter((m) => !m.parentModuleId)
    .sort((a, b) => a.order - b.order);
}

/** Aulas do módulo + dos submódulos diretos (hierarquia tem 1 nível só) */
function moduleLessonCount(course: HubCourse, mod: HubModule): number {
  const count = (m: HubModule) =>
    m.videos?.filter((v) => v.isPublished !== false).length ?? 0;
  return (
    count(mod) +
    (course.modules ?? [])
      .filter((m) => m.parentModuleId === mod.id)
      .reduce((sum, m) => sum + count(m), 0)
  );
}

function moduleThumb(mod: HubModule): string | undefined {
  return (
    mod.thumbnailHorizontal || mod.thumbnail || mod.thumbnailVertical || undefined
  );
}

export function AreaHub({ metaLabel, title, titleEm, sections }: AreaHubProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const { isAdminViewingAsStudent } = useViewModeStore();

  const [courses, setCourses] = useState<HubCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role === 'ADMIN' && !isAdminViewingAsStudent) {
      router.push('/admin/courses');
      return;
    }
    coursesService
      .findAll({ page: 1, limit: 100 })
      .then((data) => {
        const arr: HubCourse[] = Array.isArray(data)
          ? (data as unknown as HubCourse[])
          : (((data as any).data as HubCourse[]) ?? []);
        setCourses(arr);
      })
      .catch((err) => logger.error('Erro ao carregar área:', err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, hasHydrated]);

  const resolved = useMemo(
    () =>
      sections.map((s) => ({
        section: s,
        course: courses.find((c) => s.courseMatch.test(c.title)),
      })),
    [sections, courses],
  );

  if (!hasHydrated || !user) {
    return (
      <main className="px-7 py-7">
        <AtlasLoadingBar />
      </main>
    );
  }

  const isEmpty = !loading && resolved.every((r) => !r.course);

  return (
    <>
      <AtlasPageHeader metaLabel={metaLabel} title={title} titleEm={titleEm} />

      <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-9">
        {loading && <AtlasLoadingBar />}

        {isEmpty && (
          <AtlasEmptyState
            icon={BookOpen}
            title="Conteúdo indisponível"
            description="Os cursos desta área ainda não estão publicados."
          />
        )}

        {resolved.map(({ section, course }, i) => {
          if (!course) return null;

          if (section.source === 'lessons') {
            const lessons = (course.modules ?? [])
              .flatMap((m) => m.videos ?? [])
              .filter((v) => v.isPublished !== false);
            if (lessons.length === 0) return null;
            return (
              <Carousel key={i} title={section.title ?? course.title}>
                {lessons.map((v) => (
                  <CarouselCard
                    key={v.id}
                    href={`/student/courses/${course.id}/watch/${v.id}`}
                    title={v.title}
                    icon={PlayCircle}
                  />
                ))}
              </Carousel>
            );
          }

          const mods = topModules(course);
          if (mods.length === 0) return null;

          if (section.type === 'grid') {
            return (
              <section key={i}>
                {section.title && <CarouselTitle>{section.title}</CarouselTitle>}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-[14px] sm:gap-[18px]">
                  {mods.map((m) => (
                    <GridCard
                      key={m.id}
                      href={`/student/courses/${course.id}/modules/${m.id}`}
                      title={m.title}
                      meta={`${moduleLessonCount(course, m)} aulas`}
                      thumb={moduleThumb(m)}
                    />
                  ))}
                </div>
              </section>
            );
          }

          return (
            <Carousel key={i} title={section.title ?? course.title}>
              {mods.map((m) => (
                <CarouselCard
                  key={m.id}
                  href={`/student/courses/${course.id}/modules/${m.id}`}
                  title={m.title}
                  meta={`${moduleLessonCount(course, m)} aulas`}
                  thumb={moduleThumb(m)}
                />
              ))}
            </Carousel>
          );
        })}
      </div>
    </>
  );
}

function CarouselTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-[17px] font-medium tracking-[-0.005em] text-atlas-ink mb-[14px]">
      {children}
    </h2>
  );
}

function Carousel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <CarouselTitle>{title}</CarouselTitle>
      {/* Carrossel = scroll-snap nativo; sem lib de slider */}
      <div className="flex gap-3 overflow-x-auto snap-x pb-2 -mx-1 px-1 [scrollbar-width:thin]">
        {children}
      </div>
    </section>
  );
}

function CarouselCard({
  href,
  title,
  meta,
  thumb,
  icon: Icon,
}: {
  href: string;
  title: string;
  meta?: string;
  thumb?: string;
  icon?: typeof PlayCircle;
}) {
  return (
    <Link
      href={href}
      className="snap-start shrink-0 w-40 sm:w-44 rounded-xl border border-atlas-line bg-atlas-surface hover:border-atlas-line-strong transition-colors overflow-hidden"
    >
      <div className="aspect-video bg-atlas-surface-2 flex items-center justify-center overflow-hidden">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : Icon ? (
          <Icon className="size-6 text-atlas-muted" strokeWidth={1.5} />
        ) : (
          <BookOpen className="size-6 text-atlas-muted" strokeWidth={1.5} />
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[12.5px] font-medium text-atlas-ink leading-snug line-clamp-2">
          {title}
        </p>
        {meta && <p className="text-[11px] text-atlas-muted mt-1">{meta}</p>}
      </div>
    </Link>
  );
}

function GridCard({
  href,
  title,
  meta,
  thumb,
}: {
  href: string;
  title: string;
  meta?: string;
  thumb?: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-atlas-line bg-atlas-surface hover:border-atlas-line-strong transition-colors overflow-hidden"
    >
      <div className="aspect-video bg-atlas-surface-2 flex items-center justify-center overflow-hidden">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <BookOpen className="size-7 text-atlas-muted" strokeWidth={1.5} />
        )}
      </div>
      <div className="p-3.5">
        <p className="text-[14px] font-medium text-atlas-ink leading-snug line-clamp-2">
          {title}
        </p>
        {meta && <p className="text-xs text-atlas-muted mt-1">{meta}</p>}
      </div>
    </Link>
  );
}
