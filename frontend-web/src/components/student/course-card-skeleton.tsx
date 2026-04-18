import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Shimmer placeholder que espelha o layout do CourseCard real.
 * Usado nas listagens do aluno (catalogo, my-courses, in-progress,
 * completed) enquanto as requests de cursos + progresso resolvem.
 */
export function CourseCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-white border-gray-200 shadow-sm flex flex-col h-full rounded-lg !p-0 !gap-0">
      {/* Thumbnail */}
      <Skeleton className="aspect-video w-full rounded-none" />

      {/* Body */}
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />

        {/* Progress bar */}
        <Skeleton className="h-2 w-full mt-2" />

        {/* Footer (button row) */}
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Grid de N skeletons — default 8.
 */
export function CourseCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}
