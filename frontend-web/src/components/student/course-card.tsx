import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Play, CheckCircle2, Clock, ShoppingCart, Lock } from 'lucide-react';
import { EnrolledCourse } from '@/lib/types/student.types';

interface CourseCardProps {
  course: EnrolledCourse;
}

export function CourseCard({ course }: CourseCardProps) {
  const { progress } = course;
  const isEnrolled = course.enrollment.id !== '';
  const isCompleted = progress.percentage === 100;
  const isStarted = progress.percentage > 0;

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const handlePurchase = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    alert(`Comprar curso: ${course.title} por ${formatPrice(course.price)}`);
  };

  return (
    <Card className="group relative overflow-hidden bg-white border-gray-200 hover:border-blue-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full rounded-lg !p-0 !gap-0">
      {/* Borda superior colorida - aparece no hover */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
      
      <Link href={`/student/courses/${course.id}`} className="flex flex-col h-full">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gray-100">
          {(course.thumbnailHorizontal || course.thumbnailVertical || course.thumbnail) ? (
            <Image
              src={course.thumbnailHorizontal || course.thumbnailVertical || course.thumbnail || ''}
              alt={course.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
              <Play className="h-16 w-16 text-gray-400" />
            </div>
          )}
          
          {/* Badge de status ou bloqueio */}
          {!isEnrolled && (
            <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 md:px-3 md:py-1 rounded font-semibold text-[10px] md:text-xs uppercase tracking-wide flex items-center gap-0.5 md:gap-1 shadow-sm">
              <Lock className="h-2.5 w-2.5 md:h-3 md:w-3" />
              <span className="hidden sm:inline">Disponível</span>
            </div>
          )}
          {isEnrolled && isCompleted && (
            <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-gradient-to-r from-green-500 to-green-600 text-white px-1.5 py-0.5 md:px-3 md:py-1 rounded font-semibold text-[10px] md:text-xs uppercase tracking-wide flex items-center gap-0.5 md:gap-1 shadow-sm">
              <CheckCircle2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
              <span className="hidden sm:inline">Concluído</span>
            </div>
          )}
          {isEnrolled && isStarted && !isCompleted && (
            <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-1.5 py-0.5 md:px-3 md:py-1 rounded font-semibold text-[10px] md:text-xs uppercase tracking-wide flex items-center gap-0.5 md:gap-1 shadow-sm">
              <Play className="h-2.5 w-2.5 md:h-3 md:w-3 hidden sm:block" />
              {Math.round(progress.percentage)}%
            </div>
          )}
        </div>

        <CardContent className="p-3 md:p-4 flex-1 flex flex-col bg-white">
          {/* Título */}
          <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2 line-clamp-2 text-gray-900 group-hover:text-blue-600 transition-colors">
            {course.title}
          </h3>

          {/* Descrição - oculta em mobile muito pequeno */}
          {course.description && (
            <p className="text-xs md:text-sm text-gray-600 mb-2 md:mb-4 line-clamp-2 hidden sm:block">
              {course.description}
            </p>
          )}

          <div className="flex-1" />

          {/* Seção de progresso OU preço */}
          {isEnrolled ? (
            <>
              {/* Progresso para cursos matriculados */}
              <div className="space-y-1 md:space-y-2 mb-2 md:mb-4">
                <div className="flex items-center justify-between text-xs md:text-sm">
                  <span className="text-gray-600">
                    {progress.watchedVideos}/{progress.totalVideos} <span className="hidden sm:inline">aulas</span>
                  </span>
                  <span className="font-semibold text-gray-900">{Math.round(progress.percentage)}%</span>
                </div>
                {/* Progress bar com gradiente premium */}
                <div className="h-1.5 md:h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                    style={{width: `${progress.percentage}%`}}
                  />
                </div>
              </div>

              {/* Última aula assistida - oculta em mobile */}
              {isStarted && progress.lastWatchedVideo && !isCompleted && (
                <div className="hidden sm:flex pt-2 md:pt-3 border-t border-gray-200 items-start gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Última aula:</p>
                    <p className="font-medium text-gray-900 truncate">
                      {progress.lastWatchedVideo.title}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Botão de compra para cursos não matriculados */}
              <div className="pt-2 md:pt-3 border-t border-gray-200 space-y-2 md:space-y-3">
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-primary hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-md font-semibold text-xs md:text-sm h-8 md:h-10" 
                  size="sm"
                  onClick={handlePurchase}
                >
                  <ShoppingCart className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Acessar Curso</span>
                  <span className="sm:hidden">Acessar</span>
                </Button>
                <p className="text-[10px] md:text-xs text-center text-gray-500">
                  {progress.totalVideos > 0 ? `${progress.totalVideos} aulas` : 'Em breve'} • <span className="hidden sm:inline">Acesso </span>vitalício
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}
