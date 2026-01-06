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
    <Card className="overflow-hidden transition-all hover:shadow-xl hover:scale-105 cursor-pointer flex flex-col h-full bg-gray-900 border-gray-800">
      <Link href={`/student/courses/${course.id}`} className="flex flex-col h-full">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gray-800">
          {course.thumbnailUrl ? (
            <Image
              src={course.thumbnailUrl}
              alt={course.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-800 via-gray-900 to-black">
              <Play className="h-16 w-16 text-gray-600" />
            </div>
          )}
          
          {/* Badge de status ou bloqueio */}
          {!isEnrolled && (
            <div className="absolute top-3 right-3 bg-yellow-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg">
              <Lock className="h-3 w-3" />
              Disponível
            </div>
          )}
          {isEnrolled && isCompleted && (
            <div className="absolute top-3 right-3 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg">
              <CheckCircle2 className="h-3 w-3" />
              Concluído
            </div>
          )}
          {isEnrolled && isStarted && !isCompleted && (
            <div className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg">
              <Play className="h-3 w-3" />
              {Math.round(progress.percentage)}%
            </div>
          )}
        </div>

        <CardContent className="p-4 flex-1 flex flex-col bg-gray-900">
          {/* Título */}
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-white">
            {course.title}
          </h3>

          {/* Descrição */}
          {course.description && (
            <p className="text-sm text-gray-400 mb-4 line-clamp-2">
              {course.description}
            </p>
          )}

          <div className="flex-1" />

          {/* Seção de progresso OU preço */}
          {isEnrolled ? (
            <>
              {/* Progresso para cursos matriculados */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    {progress.watchedVideos} de {progress.totalVideos} aulas
                  </span>
                  <span className="font-medium text-white">{Math.round(progress.percentage)}%</span>
                </div>
                <Progress value={progress.percentage} className="h-2 bg-gray-800" />
              </div>

              {/* Última aula assistida */}
              {isStarted && progress.lastWatchedVideo && !isCompleted && (
                <div className="pt-3 border-t border-gray-800 flex items-start gap-2 text-sm text-gray-400">
                  <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">Última aula:</p>
                    <p className="font-medium text-gray-200 truncate">
                      {progress.lastWatchedVideo.title}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Botão de compra para cursos não matriculados */}
              <div className="pt-3 border-t border-gray-800 space-y-3">
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700 text-white" 
                  size="lg"
                  onClick={handlePurchase}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Acessar Curso
                </Button>
                <p className="text-xs text-center text-gray-500">
                  {progress.totalVideos > 0 ? `${progress.totalVideos} aulas` : 'Conteúdo em breve'} • Acesso vitalício
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}
