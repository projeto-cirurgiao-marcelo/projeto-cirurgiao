'use client';

/**
 * Hub "Cirurgias de tecidos moles" — layout definido pelo cliente (jul/2026):
 *   1. carrossel: módulos de "Treinamentos | Pós graduação"
 *   2. grid: módulos de topo do "Aprofundamento Tecidos Moles"
 *   3. carrossel: módulos de "Treinamentos Premium"
 *   4. carrossel: aulas de "Tecidos Moles na Prática" (curso flat)
 * Agrupamento por título de curso (mesma convenção da home) — se renomearem
 * cursos no admin, atualizar os matchers.
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
  duration?: number | null;
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

const MATCHERS = {
  pos: /p[oó]s\s*gradua/i,
  aprofundamento: /aprofundamento\s+tecidos\s+moles/i,
  premium: /treinamentos\s+premium/i,
  pratica: /tecidos\s+moles\s+na\s+pr[aá]tica/i,
};

function topModules(course: HubCourse | undefined): HubModule[] {
  if (!course?.modules) return [];
  return course.modules
    .filter((m) => !m.parentModuleId)
    .sort((a, b) => a.order - b.order);
}

/** Aulas do módulo + dos submódulos diretos (hierarquia tem 1 nível só) */
function moduleLessonCount(course: HubCourse, mod: HubModule): number {
  const own = mod.videos?.filter((v) => v.isPublished !== false).length ?? 0;
  const children = (course.modules ?? [])
    .filter((m) => m.parentModuleId === mod.id)
    .reduce(
      (sum, m) =>
        sum + (m.videos?.filter((v) => v.isPublished !== false).length ?? 0),
      0,
    );
  return own + children;
}

function moduleThumb(mod: HubModule): string | undefined {
  return mod.thumbnailHorizontal || mod.thumbnail || mod.thumbnailVertical || undefined;
}

export default function TecidosMolesHubPage() {
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
      .catch((err) => logger.error('Erro ao carregar área tecidos moles:', err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, hasHydrated]);

  const pos = useMemo(
    () => courses.find((c) => MATCHERS.pos.test(c.title)),
    [courses],
  );
  const aprofundamento = useMemo(
    () => courses.find((c) => MATCHERS.aprofundamento.test(c.title)),
    [courses],
  );
  const premium = useMemo(
    () => courses.find((c) => MATCHERS.premium.test(c.title)),
    [courses],
  );
  const pratica = useMemo(
    () => courses.find((c) => MATCHERS.pratica.test(c.title)),
    [courses],
  );

  const praticaLessons = useMemo(() => {
    if (!pratica?.modules) return [];
    return pratica.modules
      .flatMap((m) => m.videos ?? [])
      .filter((v) => v.isPublished !== false);
  }, [pratica]);

  if (!hasHydrated || !user) {
    return (
      <main className="px-7 py-7">
        <AtlasLoadingBar />
      </main>
    );
  }

  const isEmpty = !loading && !pos && !aprofundamento && !premium && !pratica;

  return (
    <>
      <AtlasPageHeader
        metaLabel="Biblioteca · Área"
        title="Cirurgias de"
        titleEm="tecidos moles"
      />

      <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-9">
        {loading && <AtlasLoadingBar />}

        {isEmpty && (
          <AtlasEmptyState
            icon={BookOpen}
            title="Conteúdo indisponível"
            description="Os cursos desta área ainda não estão publicados."
          />
        )}

        {pos && (
          <Carousel title="Treinamentos Pós graduação">
            {topModules(pos).map((m) => (
              <CarouselCard
                key={m.id}
                href={`/student/courses/${pos.id}/modules/${m.id}`}
                title={m.title}
                meta={`${moduleLessonCount(pos, m)} aulas`}
                thumb={moduleThumb(m)}
              />
            ))}
          </Carousel>
        )}

        {aprofundamento && (
          <section>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-[14px] sm:gap-[18px]">
              {topModules(aprofundamento).map((m) => (
                <GridCard
                  key={m.id}
                  href={`/student/courses/${aprofundamento.id}/modules/${m.id}`}
                  title={m.title}
                  meta={`${moduleLessonCount(aprofundamento, m)} aulas`}
                  thumb={moduleThumb(m)}
                />
              ))}
            </div>
          </section>
        )}

        {premium && (
          <Carousel title="Treinamentos Premium">
            {topModules(premium).map((m) => (
              <CarouselCard
                key={m.id}
                href={`/student/courses/${premium.id}/modules/${m.id}`}
                title={m.title}
                meta={`${moduleLessonCount(premium, m)} aulas`}
                thumb={moduleThumb(m)}
              />
            ))}
          </Carousel>
        )}

        {pratica && praticaLessons.length > 0 && (
          <Carousel title="Tecidos Moles Na Prática">
            {praticaLessons.map((v) => (
              <CarouselCard
                key={v.id}
                href={`/student/courses/${pratica.id}/watch/${v.id}`}
                title={v.title}
                icon={PlayCircle}
              />
            ))}
          </Carousel>
        )}
      </div>
    </>
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
      <h2 className="font-serif text-[17px] font-medium tracking-[-0.005em] text-atlas-ink mb-[14px]">
        {title}
      </h2>
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
        ) : (
          (Icon && <Icon className="size-6 text-atlas-muted" strokeWidth={1.5} />) || (
            <BookOpen className="size-6 text-atlas-muted" strokeWidth={1.5} />
          )
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
