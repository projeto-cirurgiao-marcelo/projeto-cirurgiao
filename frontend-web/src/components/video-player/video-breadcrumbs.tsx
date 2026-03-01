'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

interface VideoBreadcrumbsProps {
  courseName: string;
  courseId: string;
  moduleName?: string;
  videoName: string;
  className?: string;
}

export function VideoBreadcrumbs({
  courseName,
  courseId,
  moduleName,
  videoName,
  className,
}: VideoBreadcrumbsProps) {
  // Truncar texto longo
  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const items: BreadcrumbItem[] = [
    {
      label: truncate(courseName, 25),
      href: `/student/courses/${courseId}`,
    },
  ];

  if (moduleName) {
    items.push({
      label: truncate(moduleName, 20),
    });
  }

  items.push({
    label: truncate(videoName, 30),
    isCurrent: true,
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm text-gray-600', className)}
    >
      <ol className="flex items-center flex-wrap gap-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-1 text-gray-400 flex-shrink-0" />
            )}
            {item.href && !item.isCurrent ? (
              <Link
                href={item.href}
                className="hover:text-blue-600 hover:underline transition-colors truncate max-w-[150px] sm:max-w-[200px]"
                title={item.label}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  'truncate max-w-[120px] sm:max-w-[200px]',
                  item.isCurrent && 'text-gray-900 font-medium'
                )}
                title={item.label}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Versão compacta para mobile
export function VideoBreadcrumbsMobile({
  courseName,
  courseId,
  videoName,
  className,
}: Omit<VideoBreadcrumbsProps, 'moduleName'>) {
  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-xs text-gray-600', className)}
    >
      <Link
        href={`/student/courses/${courseId}`}
        className="hover:text-blue-600 hover:underline transition-colors truncate max-w-[100px]"
        title={courseName}
      >
        {truncate(courseName, 15)}
      </Link>
      <ChevronRight className="h-3 w-3 mx-1 text-gray-400 flex-shrink-0" />
      <span className="text-gray-900 font-medium truncate max-w-[150px]" title={videoName}>
        {truncate(videoName, 25)}
      </span>
    </nav>
  );
}
