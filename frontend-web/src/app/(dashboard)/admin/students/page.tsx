'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { StatCard } from '@/components/dashboard/stat-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  UserPlus,
  Activity,
  TrendingUp,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  UserCheck,
  UserX,
  Eye,
  GraduationCap,
  BookOpen,
  BarChart3,
} from 'lucide-react';
import { usersService } from '@/lib/api/users.service';
import { getErrorMessage } from '@/lib/api/client';
import type {
  StudentsOverviewResponse,
  StudentWithStats,
} from '@/lib/types/user.types';

/**
 * Pagina de gestao de alunos do administrador
 * Exibe KPIs, tabela paginada com busca/filtros e cards de informacao
 */
export default function AdminStudentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Estado dos dados
  const [data, setData] = useState<StudentsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros e busca
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'progress'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  // Debounce para busca
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagina ao mudar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sortBy]);

  // Carregar dados
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersService.getStudentsOverview({
        search: debouncedSearch || undefined,
        status: statusFilter,
        sort: sortBy,
        page: currentPage,
        limit,
      });
      setData(response);
    } catch (err) {
      setError(getErrorMessage(err));
      console.error('Erro ao carregar dados de alunos:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, sortBy, currentPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle status do aluno
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleStatus = async (student: StudentWithStats) => {
    try {
      setTogglingId(student.id);
      await usersService.updateUser(student.id, {
        isActive: !student.isActive,
      });
      await loadData();
    } catch (err) {
      console.error('Erro ao atualizar status do aluno:', err);
    } finally {
      setTogglingId(null);
    }
  };

  // Menu de acoes (dropdown com posicao fixa)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Formatacao de data relativa
  const formatRelativeDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Nunca';
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `${diffMin}min atrás`;
    if (diffHour < 24) return `${diffHour}h atrás`;
    if (diffDay < 7) return `${diffDay}d atrás`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)}sem atrás`;
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Formatacao de data simples
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Iniciais do nome
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const stats = data?.stats;
  const students = data?.students || [];
  const pagination = data?.pagination;
  const recentStudents = data?.recentStudents || [];
  const topCourses = data?.topCourses || [];

  return (
    <>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Alunos
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Gerencie sua base de alunos e acompanhe o progresso de cada um.
        </p>
      </div>

      {/* KPIs Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total de Alunos"
          value={loading ? '...' : (stats?.totalStudents ?? 0).toLocaleString()}
          icon={Users}
          color="primary"
        />
        <StatCard
          title="Ativos (30 dias)"
          value={loading ? '...' : (stats?.activeStudents30d ?? 0).toLocaleString()}
          icon={Activity}
          color="success"
        />
        <StatCard
          title="Progresso Médio"
          value={loading ? '...' : `${Math.round(stats?.averageProgress ?? 0)}%`}
          icon={TrendingUp}
          color="warning"
        />
        <StatCard
          title="Novos (30 dias)"
          value={loading ? '...' : (stats?.newStudents30d ?? 0).toLocaleString()}
          icon={UserPlus}
          color="secondary"
        />
      </div>

      {/* Tabela de Alunos */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Lista de Alunos</CardTitle>
              <CardDescription>
                {loading
                  ? 'Carregando...'
                  : `${pagination?.total ?? 0} alunos encontrados`}
              </CardDescription>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            {/* Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
                }
                className="h-10 pl-10 pr-8 rounded-md border-2 border-gray-200 bg-white text-sm font-medium text-gray-900 shadow-sm transition-all duration-200 outline-none hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 appearance-none cursor-pointer dark:bg-gray-900 dark:border-gray-700 dark:text-white"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>

            {/* Sort */}
            <div className="relative">
              <BarChart3 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'recent' | 'name' | 'progress')
                }
                className="h-10 pl-10 pr-8 rounded-md border-2 border-gray-200 bg-white text-sm font-medium text-gray-900 shadow-sm transition-all duration-200 outline-none hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 appearance-none cursor-pointer dark:bg-gray-900 dark:border-gray-700 dark:text-white"
              >
                <option value="recent">Mais Recente</option>
                <option value="name">Nome A-Z</option>
                <option value="progress">Progresso</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--primary-500))]" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-[rgb(var(--primary-500))] text-white rounded-lg hover:bg-[rgb(var(--primary-600))] transition-colors text-sm"
              >
                Tentar Novamente
              </button>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">
                Nenhum aluno encontrado
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {search || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Os alunos aparecem aqui quando se matriculam na plataforma.'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Cursos</TableHead>
                    <TableHead>Progresso Médio</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      {/* Aluno - Avatar + Nome + Email */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-[rgb(var(--primary-500))] flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-white">
                              {getInitials(student.name)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {student.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {student.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Cursos Matriculados */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {student.enrollmentCount}
                          </span>
                        </div>
                      </TableCell>

                      {/* Progresso Medio */}
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-[140px]">
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.round(student.averageProgress)}%`,
                                backgroundColor:
                                  student.averageProgress >= 70
                                    ? 'rgb(var(--accent-500))'
                                    : student.averageProgress >= 40
                                      ? 'rgb(var(--secondary-500))'
                                      : 'rgb(var(--primary-500))',
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-10 text-right">
                            {Math.round(student.averageProgress)}%
                          </span>
                        </div>
                      </TableCell>

                      {/* Ultimo Acesso */}
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatRelativeDate(student.lastAccessAt)}
                        </span>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>
                        <Badge
                          variant={student.isActive ? 'success' : 'destructive'}
                        >
                          {student.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>

                      {/* Acoes */}
                      <TableCell className="text-right">
                        <button
                          ref={(el) => { menuBtnRefs.current[student.id] = el; }}
                          onClick={() => {
                            if (openMenuId === student.id) {
                              setOpenMenuId(null);
                            } else {
                              const btn = menuBtnRefs.current[student.id];
                              if (btn) {
                                const rect = btn.getBoundingClientRect();
                                const menuHeight = 88; // altura aprox. do menu
                                const spaceBelow = window.innerHeight - rect.bottom;
                                setMenuPos({
                                  top: spaceBelow < menuHeight
                                    ? rect.top - menuHeight - 4
                                    : rect.bottom + 4,
                                  left: rect.right - 192, // 192 = w-48
                                });
                              }
                              setOpenMenuId(student.id);
                            }
                          }}
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4 text-gray-500" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Dropdown de acoes (fixo, fora da tabela para evitar overflow) */}
              {openMenuId && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setOpenMenuId(null)}
                  />
                  <div
                    className="fixed w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
                    style={{ top: menuPos.top, left: menuPos.left }}
                  >
                    <button
                      onClick={() => {
                        const id = openMenuId;
                        setOpenMenuId(null);
                        router.push(`/admin/students/${id}`);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      Ver Detalhes
                    </button>
                    <button
                      onClick={() => {
                        const s = students.find((st) => st.id === openMenuId);
                        setOpenMenuId(null);
                        if (s) handleToggleStatus(s);
                      }}
                      disabled={togglingId === openMenuId}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {students.find((s) => s.id === openMenuId)?.isActive ? (
                        <>
                          <UserX className="h-4 w-4 text-red-500" />
                          <span className="text-red-600 dark:text-red-400">
                            Desativar
                          </span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 dark:text-green-400">
                            Ativar
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Paginacao */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Mostrando{' '}
                    <span className="font-semibold">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{' '}
                    a{' '}
                    <span className="font-semibold">
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total
                      )}
                    </span>{' '}
                    de{' '}
                    <span className="font-semibold">{pagination.total}</span>{' '}
                    alunos
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </button>

                    {/* Numeros de pagina */}
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from(
                        { length: pagination.totalPages },
                        (_, i) => i + 1
                      )
                        .filter((page) => {
                          // Mostrar primeira, ultima, e paginas proximas da atual
                          return (
                            page === 1 ||
                            page === pagination.totalPages ||
                            Math.abs(page - currentPage) <= 1
                          );
                        })
                        .map((page, idx, arr) => (
                          <span key={page} className="flex items-center">
                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                              <span className="px-1 text-gray-400">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`min-w-[32px] h-8 px-2 text-sm font-medium rounded-md transition-colors ${
                                page === currentPage
                                  ? 'bg-[rgb(var(--primary-500))] text-white'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                            >
                              {page}
                            </button>
                          </span>
                        ))}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(pagination.totalPages, p + 1)
                        )
                      }
                      disabled={currentPage === pagination.totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Cards Inferiores - Alunos Recentes + Top Cursos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alunos Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[rgb(var(--primary-500))]" />
              Alunos Recentes
            </CardTitle>
            <CardDescription>Últimos 5 alunos cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[rgb(var(--primary-500))]" />
              </div>
            ) : recentStudents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Nenhum aluno cadastrado ainda
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-full bg-[rgb(var(--primary-500)/0.1)] flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[rgb(var(--primary-500))]">
                        {getInitials(student.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {student.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {student.email}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                      {formatDate(student.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Cursos por Matriculas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[rgb(var(--accent-500))]" />
              Distribuição por Curso
            </CardTitle>
            <CardDescription>Top 5 cursos com mais matrículas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[rgb(var(--primary-500))]" />
              </div>
            ) : topCourses.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Nenhum curso com matrículas ainda
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {topCourses.map((course, index) => {
                  const maxCount = topCourses[0]?.enrollmentCount || 1;
                  const barWidth = Math.max(
                    5,
                    (course.enrollmentCount / maxCount) * 100
                  );

                  return (
                    <div key={course.courseId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate pr-4">
                          {course.title}
                        </p>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 shrink-0">
                          {course.enrollmentCount}{' '}
                          <span className="text-xs font-normal text-gray-400">
                            {course.enrollmentCount === 1
                              ? 'aluno'
                              : 'alunos'}
                          </span>
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor:
                              index === 0
                                ? 'rgb(var(--accent-500))'
                                : index === 1
                                  ? 'rgb(var(--primary-500))'
                                  : 'rgb(var(--secondary-500))',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
