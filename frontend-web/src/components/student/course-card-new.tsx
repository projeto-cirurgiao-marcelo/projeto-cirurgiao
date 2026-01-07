'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  CheckCircle2,
  Clock,
  BookOpen,
  Video,
  Award,
  Star,
  TrendingUp,
} from 'lucide-react';
import { EnrolledCourse } from '@/lib/types/student.types';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  course: EnrolledCourse;
  variant?: 'default' | 'compact' | 'featured';
  showProgress?: boolean;
  showInstructor?: boolean;
  className?: string;
}

export function CourseCardNew({
  course,
  variant = 'default',
  showProgress = true,
  showInstructor = true,
  className,
}: CourseCardProps) {
  const { progress } = course;
  const isEnrolled = course.enrollment.id !== '';
  const isCompleted = progress.percentage === 100;
  const isStarted = progress.percentage > 0;

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const getProgressColor = () => {
    if (progress.percentage >= 67) return 'progress-fill-high';
    if (progress.percentage >= 34) return 'progress-fill-medium';
    return 'progress-fill-low';
  };

  return (
    <Card
      className={cn(
        'overflow-hidden card-hover group cursor-pointer flex flex-col h-full',
        'bg-card border border-border shadow-base',
        className
      )}
    >
      <Link href={`/student/courses/${course.id}`} className="flex flex-col h-full">
        {/* Thumbnail com overlay */}
        <div className="relative aspect-video bg-muted overflow-hidden">
          {course.thumbnailUrl ? (
            <Image
              src={course.thumbnailUrl}
              alt={course.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-[rgb(var(--primary-50))] to-[rgb(var(--primary-100))] dark:from-[rgb(var(--primary-900))] dark:to-[rgb(var(--primary-800))]">
              <Video className="h-16 w-16 text-[rgb(var(--primary-300))]" />
            </div>
          )}

          {/* Play overlay no hover */}
          {isEnrolled && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <div className="bg-white rounded-full p-4 shadow-xl">
                <Play className="h-8 w-8 text-[rgb(var(--primary-500))] fill-current" />
              </div>
            </div>
          )}

          {/* Badge de status */}
          <div className="absolute top-3 right-3">
            {!isEnrolled && (
              <Badge className="bg-[rgb(var(--secondary-500))] text-white shadow-lg hover:bg-[rgb(var(--secondary-600))]">
                <TrendingUp className="h-3 w-3 mr-1" />
                Novo
              </Badge>
            )}
            {isCompleted && (
              <Badge className="bg-[rgb(var(--accent-500))] text-white shadow-lg">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Concluído
              </Badge>
            )}
            {isEnrolled && isStarted && !isCompleted && (
              <Badge className="bg-[rgb(var(--primary-500))] text-white shadow-lg">
                <Play className="h-3 w-3 mr-1" />
                {Math.round(progress.percentage)}%
              </Badge>
            )}
          </div>

          {/* Badge featured (opcional) */}
          {variant === 'featured' && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-[rgb(var(--gold))] text-white shadow-lg">
                <Award className="h-3 w-3 mr-1" />
                Destaque
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-5 flex-1 flex flex-col">
          {/* Título */}
          <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2 text-foreground group-hover:text-[rgb(var(--primary-600))] transition-colors">
            {course.title}
          </h3>

          {/* Instrutor */}
          {showInstructor && course.instructor && (
            <p className="text-sm text-muted-foreground mb-3">
              {course.instructor.name}
            </p>
          )}

          {/* Rating (placeholder - adicionar quando tiver reviews) */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-[rgb(var(--secondary-500))] text-[rgb(var(--secondary-500))]" />
              <span className="text-sm font-semibold text-foreground">4.8</span>
            </div>
            <span className="text-xs text-muted-foreground">(1.2k avaliações)</span>
          </div>

          {/* Descrição (somente em variant default) */}
          {variant === 'default' && course.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {course.description}
            </p>
          )}

          <div className="flex-1" />

          {/* Info de conteúdo */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>{course._count?.modules || 0} módulos</span>
            </div>
            <div className="flex items-center gap-1">
              <Video className="h-4 w-4" />
              <span>{progress.totalVideos} aulas</span>
            </div>
            {isEnrolled && progress.totalWatchTime > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{Math.round(progress.totalWatchTime / 60)}min</span>
              </div>
            )}
          </div>

          {/* Seção de progresso OU preço */}
          {isEnrolled && showProgress ? (
            <>
              {/* Barra de progresso */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {progress.watchedVideos} de {progress.totalVideos} aulas
                  </span>
                  <span className="font-semibold text-foreground">
                    {Math.round(progress.percentage)}%
                  </span>
                </div>
                <div className="progress-bar h-2">
                  <div
                    className={cn('progress-fill', getProgressColor())}
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>

              {/* CTA Button */}
              <Button
                className="w-full mt-4"
                variant={isCompleted ? 'outline' : 'default'}
                asChild
              >
                <span>
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Revisar Curso
                    </>
                  ) : isStarted ? (
                    <>
                      <Play className="h-4 w-4" />
                      Continuar Aprendendo
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Começar Agora
                    </>
                  )}
                </span>
              </Button>
            </>
          ) : (
            /* Não matriculado */
            <>
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <span className="text-2xl font-bold text-foreground">
                    {formatPrice(course.price)}
                  </span>
                  {course.price > 0 && (
                    <span className="text-xs text-muted-foreground ml-2 line-through">
                      R$ {(course.price * 1.5 / 100).toFixed(2)}
                    </span>
                  )}
                </div>
                {course.price > 0 && (
                  <Badge variant="secondary" className="text-[rgb(var(--accent-600))]">
                    33% OFF
                  </Badge>
                )}
              </div>

              <Button className="w-full" variant="default" size="lg">
                Ver Curso
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-3">
                Acesso vitalício • Certificado
              </p>
            </>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}
