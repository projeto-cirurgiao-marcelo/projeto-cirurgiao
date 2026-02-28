'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
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
  Layers,
  Search,
  Filter,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  Plus,
  Video,
  BookOpen,
  Image as ImageIcon,
} from 'lucide-react';
import { coursesService, modulesService, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Course, Module, PaginatedResponse } from '@/lib/types/course.types';

export default function AdminModulesPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Estado dos cursos (para dropdown)
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Estado dos modulos
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Menu de acoes (dropdown com posicao fixa)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Carregar cursos (segue mesmo padrao defensivo de admin/courses/page.tsx)
  useEffect(() => {
    if (!user) return;
    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        const response = await coursesService.findAll({ page: 1, limit: 100 });
        // Backend pode retornar array direto ou { data: [...] } — tratar ambos
        const coursesData = Array.isArray(response) ? response : (response.data || []);
        setCourses(coursesData as Course[]);
      } catch (err) {
        console.error('Erro ao carregar cursos:', err);
        toast.error('Erro ao carregar cursos');
      } finally {
        setLoadingCourses(false);
      }
    };
    loadCourses();
  }, [user]);

  // Carregar modulos ao selecionar curso
  const loadModules = useCallback(async () => {
    if (!selectedCourseId) {
      setModules([]);
      return;
    }
    try {
      setLoadingModules(true);
      setError(null);
      const data = await modulesService.findAll(selectedCourseId);
      setModules(data);
    } catch (err) {
      setError(getErrorMessage(err));
      console.error('Erro ao carregar modulos:', err);
    } finally {
      setLoadingModules(false);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  // Deletar modulo
  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await modulesService.delete(id);
      toast.success('Modulo excluido com sucesso');
      setConfirmDeleteId(null);
      await loadModules();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  // Filtrar modulos por busca
  const filteredModules = modules.filter((m) => {
    if (!debouncedSearch) return true;
    return m.title.toLowerCase().includes(debouncedSearch.toLowerCase());
  });

  // Obter nome do curso selecionado
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Modulos
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Gerencie os modulos dos seus cursos. Selecione um curso para visualizar seus modulos.
        </p>
      </div>

      {/* Tabela de Modulos */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Lista de Modulos</CardTitle>
              <CardDescription>
                {!selectedCourseId
                  ? 'Selecione um curso para ver seus modulos'
                  : loadingModules
                    ? 'Carregando...'
                    : `${filteredModules.length} modulo${filteredModules.length !== 1 ? 's' : ''} encontrado${filteredModules.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </div>
            {selectedCourseId && (
              <button
                onClick={() => router.push(`/admin/courses/${selectedCourseId}/modules/new`)}
                className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--primary-500))] text-white rounded-lg hover:bg-[rgb(var(--primary-600))] transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Novo Modulo
              </button>
            )}
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            {/* Dropdown de Curso */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSearch('');
                  setDebouncedSearch('');
                }}
                disabled={loadingCourses}
                className="h-10 pl-10 pr-8 rounded-md border-2 border-gray-200 bg-white text-sm font-medium text-gray-900 shadow-sm transition-all duration-200 outline-none hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 appearance-none cursor-pointer dark:bg-gray-900 dark:border-gray-700 dark:text-white min-w-[240px]"
              >
                <option value="">
                  {loadingCourses ? 'Carregando cursos...' : 'Selecione um curso'}
                </option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Busca */}
            {selectedCourseId && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome do modulo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!selectedCourseId ? (
            // Estado: nenhum curso selecionado
            <div className="text-center py-16">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium text-lg">
                Selecione um curso
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Escolha um curso no filtro acima para visualizar e gerenciar seus modulos.
              </p>
            </div>
          ) : loadingModules ? (
            // Estado: carregando
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--primary-500))]" />
            </div>
          ) : error ? (
            // Estado: erro
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={loadModules}
                className="px-4 py-2 bg-[rgb(var(--primary-500))] text-white rounded-lg hover:bg-[rgb(var(--primary-600))] transition-colors text-sm"
              >
                Tentar Novamente
              </button>
            </div>
          ) : filteredModules.length === 0 ? (
            // Estado: vazio
            <div className="text-center py-12">
              <Layers className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">
                {debouncedSearch
                  ? 'Nenhum modulo encontrado'
                  : 'Este curso nao possui modulos'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                {debouncedSearch
                  ? 'Tente ajustar os termos da busca.'
                  : 'Comece criando o primeiro modulo para este curso.'}
              </p>
              {!debouncedSearch && (
                <button
                  onClick={() => router.push(`/admin/courses/${selectedCourseId}/modules/new`)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[rgb(var(--primary-500))] text-white rounded-lg hover:bg-[rgb(var(--primary-600))] transition-colors text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Criar Modulo
                </button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Thumb</TableHead>
                    <TableHead>Titulo</TableHead>
                    <TableHead>Videos</TableHead>
                    <TableHead>Ordem</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModules.map((mod) => (
                    <TableRow key={mod.id}>
                      {/* Thumbnail */}
                      <TableCell>
                        <div className="h-10 w-10 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                          {mod.thumbnailHorizontal || mod.thumbnailVertical || mod.thumbnail ? (
                            <img
                              src={mod.thumbnailHorizontal || mod.thumbnailVertical || mod.thumbnail || ''}
                              alt={mod.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </TableCell>

                      {/* Titulo + Descricao */}
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {mod.title}
                          </p>
                          {mod.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[300px]">
                              {mod.description}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Videos count */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Video className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {mod._count?.videos ?? mod.videos?.length ?? 0}
                          </span>
                        </div>
                      </TableCell>

                      {/* Ordem */}
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          #{mod.order}
                        </Badge>
                      </TableCell>

                      {/* Acoes */}
                      <TableCell className="text-right">
                        <button
                          ref={(el) => { menuBtnRefs.current[mod.id] = el; }}
                          onClick={() => {
                            if (openMenuId === mod.id) {
                              setOpenMenuId(null);
                            } else {
                              const btn = menuBtnRefs.current[mod.id];
                              if (btn) {
                                const rect = btn.getBoundingClientRect();
                                const menuHeight = 88;
                                const spaceBelow = window.innerHeight - rect.bottom;
                                setMenuPos({
                                  top: spaceBelow < menuHeight
                                    ? rect.top - menuHeight - 4
                                    : rect.bottom + 4,
                                  left: rect.right - 192,
                                });
                              }
                              setOpenMenuId(mod.id);
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
                        router.push(`/admin/courses/${selectedCourseId}/modules/${id}/edit`);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        const id = openMenuId;
                        setOpenMenuId(null);
                        setConfirmDeleteId(id);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmacao de exclusao */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setConfirmDeleteId(null)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Confirmar exclusao
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Tem certeza que deseja excluir o modulo{' '}
              <strong>{modules.find((m) => m.id === confirmDeleteId)?.title}</strong>?
              Esta acao nao pode ser desfeita e todos os videos do modulo serao removidos.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deletingId === confirmDeleteId && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
