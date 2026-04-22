'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { StatCard } from '@/components/dashboard/stat-card';
import {
  Users,
  BookOpen,
  Clock,
  TrendingUp,
  GraduationCap,
  Loader2,
  ArrowRight,
  BarChart3,
  Activity,
  Plus,
  Edit,
  Eye,
} from 'lucide-react';
import { coursesService } from '@/lib/api/courses.service';
import { Course } from '@/lib/types/course.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '@/components/shared/page-transition';

import { logger } from '@/lib/logger';

interface DashboardStats {
  totalStudents: number;
  totalCourses: number;
  totalHours: number;
  completionRate: number;
}

interface RecentActivity {
  user: string;
  action: string;
  target: string;
  time: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalCourses: 0,
    totalHours: 0,
    completionRate: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoadingData(true);

      const response = await coursesService.findAll();
      const coursesData = response.data || [];
      setCourses(coursesData);

      const totalCourses = coursesData.length;
      const totalStudents = coursesData.reduce((acc: number, course: Course) => acc + (course._count?.enrollments || 0), 0);

      let totalMinutes = 0;
      coursesData.forEach((course: Course) => {
        course.modules?.forEach((module) => {
          module.videos?.forEach((video) => {
            totalMinutes += video.duration || 0;
          });
        });
      });
      const totalHours = Math.round(totalMinutes / 60);

      setStats({
        totalStudents,
        totalCourses,
        totalHours,
        completionRate: 0,
      });
    } catch (error) {
      logger.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const recentActivities: RecentActivity[] = [
    { user: 'João Silva', action: 'concluiu o curso', target: 'Tecidos Moles na Prática', time: '2 min atrás' },
    { user: 'Maria Santos', action: 'iniciou o módulo', target: 'Introdução às Cirurgias', time: '15 min atrás' },
    { user: 'Pedro Costa', action: 'assistiu ao vídeo', target: 'Técnicas de Sutura', time: '1h atrás' },
    { user: 'Ana Paula', action: 'se matriculou em', target: 'Top 10 Cirurgias', time: '2h atrás' },
    { user: 'Carlos Lima', action: 'concluiu o vídeo', target: 'Anestesia em Pequenos Animais', time: '3h atrás' },
  ];

  return (
    <PageTransition>
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Bem-vindo de volta, {user?.name}! Aqui está o resumo da plataforma.
          </p>
        </div>

        {/* Stats Grid */}
        <StaggerContainer className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
          <StaggerItem>
            <StatCard
              title="Total de Alunos"
              value={loadingData ? '...' : stats.totalStudents.toLocaleString()}
              icon={Users}
              trend={{ value: 12.5, label: 'vs mês anterior' }}
              color="primary"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="Cursos Ativos"
              value={loadingData ? '...' : stats.totalCourses.toString()}
              icon={BookOpen}
              trend={{ value: 8.2, label: 'vs mês anterior' }}
              color="success"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="Horas de Conteúdo"
              value={loadingData ? '...' : `${stats.totalHours}h`}
              icon={Clock}
              color="warning"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="Taxa de Conclusão"
              value={loadingData ? '...' : `${stats.completionRate}%`}
              icon={TrendingUp}
              trend={{ value: 5.1, label: 'vs mês anterior' }}
              color="secondary"
            />
          </StaggerItem>
        </StaggerContainer>

        {/* Charts & Activity Row */}
        <div className="grid gap-6 lg:grid-cols-5 mb-8">
          {/* Chart Placeholder */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Matrículas</h3>
                <p className="text-xs text-gray-500">Últimos 6 meses</p>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                <button className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-gray-700 shadow-sm">Mensal</button>
                <button className="px-2.5 py-1 rounded-md text-xs font-semibold text-gray-400 hover:text-gray-600">Semanal</button>
              </div>
            </div>
            <div className="p-6">
              <div className="h-48 md:h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50 rounded-lg border border-dashed border-blue-200">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-blue-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-blue-600">Gráfico de Matrículas</p>
                  <p className="text-xs text-gray-400 mt-1">Integre com biblioteca de charts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Atividade Recente</h3>
                <p className="text-xs text-gray-500">Últimas ações</p>
              </div>
              <Activity className="w-4 h-4 text-gray-400" />
            </div>
            <div className="divide-y divide-gray-100">
              {recentActivities.map((activity, index) => (
                <div key={index} className="px-6 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mt-0.5">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">{activity.user}</span>{' '}
                        {activity.action}{' '}
                        <span className="font-medium text-blue-600">{activity.target}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Courses Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-900">Cursos Cadastrados</h3>
              <p className="text-xs text-gray-500">
                {loadingData ? 'Carregando...' : `${courses.length} cursos na plataforma`}
              </p>
            </div>
            <Button
              onClick={() => router.push('/admin/courses/new')}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Curso
            </Button>
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">Nenhum curso cadastrado</p>
              <p className="text-sm text-gray-400 mt-1">Comece criando seu primeiro curso</p>
              <Button
                onClick={() => router.push('/admin/courses/new')}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Criar Primeiro Curso
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 md:px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Curso
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Alunos
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Módulos
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 md:px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <p className="text-sm font-semibold text-gray-900">{course.title}</p>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <span className="text-sm text-gray-600 font-medium">
                          {course._count?.enrollments || 0}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <span className="text-sm text-gray-600 font-medium">
                          {course._count?.modules || 0}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          course.isPublished
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {course.isPublished ? 'Publicado' : 'Rascunho'}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-right">
                        <button
                          onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
    </PageTransition>
  );
}
