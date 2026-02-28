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
  Play,
  Search,
  Filter,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  BookOpen,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { coursesService, modulesService, videosService, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Course, Module, Video, VideoUploadStatus } from '@/lib/types/course.types';

// Helpers
const formatDuration = (seconds: number | null): string => {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const uploadStatusConfig: Record<VideoUploadStatus, { label: string; className: string }> = {
  READY: { label: 'Pronto', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  PROCESSING: { label: 'Processando', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse' },
  UPLOADING: { label: 'Enviando', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse' },
  PENDING: { label: 'Pendente', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
  ERROR: { label: 'Erro', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

export default function AdminVideosPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Estado dos cursos e modulos (para dropdowns)
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);

  // Estado dos videos
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Toggle publish
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
  useEffect(() => {
    if (!selectedCourseId) {
      setModules([]);
      setSelectedModuleId('');
      setVideos([]);
      return;
    }
    const loadModules = async () => {
      try {
        setLoadingModules(true);
        const data = await modulesService.findAll(selectedCourseId);
        setModules(data);
      } catch (err) {
        console.error('Erro ao carregar modulos:', err);
        toast.error('Erro ao carregar modulos');
      } finally {
        setLoadingModules(false);
      }
    };
    loadModules();
  }, [selectedCourseId]);

  // Carregar videos ao selecionar modulo
  const loadVideos = useCallback(async () => {
    if (!selectedModuleId) {
      setVideos([]);
      return;
    }
    try {
      setLoadingVideos(true);
      setError(null);
      const data = await videosService.findAll(selectedModuleId);
      setVideos(data);
    } catch (err) {
      setError(getErrorMessage(err));
      console.error('Erro ao carregar videos:', err);
    } finally {
      setLoadingVideos(false);
    }
  }, [selectedModuleId]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Toggle publish
  const handleTogglePublish = async (video: Video) => {
    try {
      setTogglingId(video.id);
      await videosService.togglePublish(video.id);
      toast.success(video.isPublished ? 'Video despublicado' : 'Video publicado');
      await loadVideos();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  // Deletar video
  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await videosService.delete(id);
      toast.success('Video excluido com sucesso');
      setConfirmDeleteId(null);
      await loadVideos();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  // Filtrar videos
  const filteredVideos = videos.filter((v) => {
    // Filtro de busca
    if (debouncedSearch && !v.title.toLowerCase().includes(debouncedSearch.toLowerCase())) {
      return false;
    }
    // Filtro de status
    if (statusFilter === 'published' && !v.isPublished) return false;
    if (statusFilter === 'draft' && v.isPublished) return false;
    return true;
  });

  // Mensagem do estado atual dos filtros
  const getEmptyMessage = (): string => {
    if (!selectedCourseId) return 'Selecione um curso';
    if (!selectedModuleId) return 'Selecione um modulo';
    return '';
  };

  return (
    <>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Videos
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Gerencie os videos da plataforma. Selecione um curso e modulo para visualizar os videos.
        </p>
      </div>

      {/* Tabela de Videos */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Lista de Videos</CardTitle>
              <CardDescription>
                {!selectedCourseId
                  ? 'Selecione um curso para comecar'
                  : !selectedModuleId
                    ? 'Selecione um modulo para ver seus videos'
                    : loadingVideos
                      ? 'Carregando...'
                      : `${filteredVideos.length} video${filteredVideos.length !== 1 ? 's' : ''} encontrado${filteredVideos.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            {/* Dropdown de Curso */}
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedModuleId('');
                  setVideos([]);
                  setSearch('');
                  setDebouncedSearch('');
                  setStatusFilter('all');
                }}
                disabled={loadingCourses}
                className="h-10 pl-10 pr-8 rounded-md border-2 border-gray-200 bg-white text-sm font-medium text-gray-900 shadow-sm transition-all duration-200 outline-none hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 appearance-none cursor-pointer dark:bg-gray-900 dark:border-gray-700 dark:text-white min-w-[200px]"
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

            {/* Dropdown de Modulo */}
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={selectedModuleId}
                onChange={(e) => {
                  setSelectedModuleId(e.target.value);
                  setSearch('');
                  setDebouncedSearch('');
                  setStatusFilter('all');
                }}
                disabled={!selectedCourseId || loadingModules}
                className="h-10 pl-10 pr-8 rounded-md border-2 border-gray-200 bg-white text-sm font-medium text-gray-900 shadow-sm transition-all duration-200 outline-none hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 appearance-none cursor-pointer dark:bg-gray-900 dark:border-gray-700 dark:text-white min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!selectedCourseId
                    ? 'Selecione um curso primeiro'
                    : loadingModules
                      ? 'Carregando modulos...'
                      : 'Selecione um modulo'}
                </option>
                {modules.map((mod) => (
                  <option key={mod.id} value={mod.id}>
                    {mod.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Busca e filtro de status (aparecem apos selecionar modulo) */}
            {selectedModuleId && (
              <>
                {/* Busca */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por titulo..."
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
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
                    className="h-10 pl-10 pr-8 rounded-md border-2 border-gray-200 bg-white text-sm font-medium text-gray-900 shadow-sm transition-all duration-200 outline-none hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 appearance-none cursor-pointer dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                  >
                    <option value="all">Todos</option>
                    <option value="published">Publicados</option>
                    <option value="draft">Rascunho</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!selectedCourseId || !selectedModuleId ? (
            // Estado: filtros incompletos
            <div className="text-center py-16">
              {!selectedCourseId ? (
                <>
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium text-lg">
                    Selecione um curso
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Escolha um curso para visualizar seus modulos e videos.
                  </p>
                </>
              ) : (
                <>
                  <Layers className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium text-lg">
                    Selecione um modulo
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Escolha um modulo para visualizar e gerenciar seus videos.
                  </p>
                </>
              )}
            </div>
          ) : loadingVideos ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--primary-500))]" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={loadVideos}
                className="px-4 py-2 bg-[rgb(var(--primary-500))] text-white rounded-lg hover:bg-[rgb(var(--primary-600))] transition-colors text-sm"
              >
                Tentar Novamente
              </button>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-12">
              <Play className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">
                {debouncedSearch || statusFilter !== 'all'
                  ? 'Nenhum video encontrado'
                  : 'Este modulo nao possui videos'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {debouncedSearch || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Os videos aparecem aqui quando adicionados ao modulo.'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Thumb</TableHead>
                    <TableHead>Titulo</TableHead>
                    <TableHead>Duracao</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Upload</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVideos.map((video) => {
                    const uploadCfg = uploadStatusConfig[video.uploadStatus] || uploadStatusConfig.PENDING;
                    return (
                      <TableRow key={video.id}>
                        {/* Thumbnail */}
                        <TableCell>
                          <div className="h-10 w-10 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                            {video.thumbnailUrl ? (
                              <img
                                src={video.thumbnailUrl}
                                alt={video.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Play className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </TableCell>

                        {/* Titulo + Descricao */}
                        <TableCell>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {video.title}
                            </p>
                            {video.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[280px]">
                                {video.description}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Duracao */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                              {formatDuration(video.duration)}
                            </span>
                          </div>
                        </TableCell>

                        {/* Status publicacao */}
                        <TableCell>
                          <Badge variant={video.isPublished ? 'success' : 'outline'}>
                            {video.isPublished ? 'Publicado' : 'Rascunho'}
                          </Badge>
                        </TableCell>

                        {/* Upload status */}
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${uploadCfg.className}`}>
                            {uploadCfg.label}
                          </span>
                        </TableCell>

                        {/* Acoes */}
                        <TableCell className="text-right">
                          <button
                            ref={(el) => { menuBtnRefs.current[video.id] = el; }}
                            onClick={() => {
                              if (openMenuId === video.id) {
                                setOpenMenuId(null);
                              } else {
                                const btn = menuBtnRefs.current[video.id];
                                if (btn) {
                                  const rect = btn.getBoundingClientRect();
                                  const menuHeight = 132;
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  setMenuPos({
                                    top: spaceBelow < menuHeight
                                      ? rect.top - menuHeight - 4
                                      : rect.bottom + 4,
                                    left: rect.right - 192,
                                  });
                                }
                                setOpenMenuId(video.id);
                              }
                            }}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <MoreHorizontal className="h-4 w-4 text-gray-500" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                        router.push(`/admin/modules/${selectedModuleId}/videos/${id}/edit`);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        const vid = videos.find((v) => v.id === openMenuId);
                        setOpenMenuId(null);
                        if (vid) handleTogglePublish(vid);
                      }}
                      disabled={togglingId === openMenuId}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {videos.find((v) => v.id === openMenuId)?.isPublished ? (
                        <>
                          <EyeOff className="h-4 w-4 text-yellow-500" />
                          <span className="text-yellow-600 dark:text-yellow-400">Despublicar</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 dark:text-green-400">Publicar</span>
                        </>
                      )}
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
              Tem certeza que deseja excluir o video{' '}
              <strong>{videos.find((v) => v.id === confirmDeleteId)?.title}</strong>?
              Esta acao nao pode ser desfeita.
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
