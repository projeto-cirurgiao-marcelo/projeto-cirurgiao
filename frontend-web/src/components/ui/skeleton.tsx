import { cn } from '@/lib/utils';

/**
 * Skeleton shimmer para estados de loading. Uso consistente em
 * listagens (catalogo, my-courses, forum, etc.).
 *
 *   <Skeleton className="h-8 w-40" />
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      {...props}
    />
  );
}
