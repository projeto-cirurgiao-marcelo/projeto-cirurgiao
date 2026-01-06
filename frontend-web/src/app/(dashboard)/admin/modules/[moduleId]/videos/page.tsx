'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Plus, GripVertical, Pencil, Trash2, Upload, Eye, EyeOff, X, FileVideo, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { modulesService, videosService } from '@/lib/api';
import type { Module, Video, VideoUploadStatus } from '@/lib/types/course.types';

// Componente para mostrar status de upload
function UploadStatusBadge({ status, progress }: { status: VideoUploadStatus; progress: number }) {
  switch (status) {
    case 'PENDING':
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Pendente
        </Badge>
      );
    case 'UPLOADING':
      return (
        <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800">
          <Loader2 className="h-3 w-3 animate-spin" />
          Enviando {progress}%
        </Badge>
      );
    case 'PROCESSING':
      return (
        <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Processando
        </Badge>
      );
    case 'READY':
      return (
        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3" />
          Pronto
        </Badge>
      );
    case 'ERROR':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Erro
        </Badge>
      );
    default:
      return null;
  }
}

export default function ModuleVideosPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const moduleId = params.moduleId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [module, setModule] = useState<Module | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);

  // Estados do modal de upload
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');

  // Carregar dados do módulo
  useEffect(() => {
    const loadModule = async () => {
      try {
        setIsLoading(true);
        const data = await modulesService.findOne(moduleId);
        setModule(data);
        await loadVideos();
      } catch (error) {
        console.error('Erro ao carregar módulo:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar o módulo.',
          variant: 'destructive',
        });
        router.push('/admin/courses');
      } finally {
        setIsLoading(false);
      }
    };

    loadModule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  // Carregar vídeos do módulo
  const loadVideos = useCallback(async () => {
    try {
      setIsLoadingVideos(true);
      const data = await videosService.list(moduleId);
      setVideos(data);
    } catch (error) {
      console.error('Erro ao carregar vídeos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os vídeos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingVideos(false);
    }
  }, [moduleId, toast]);

  // Polling para vídeos em processamento
  useEffect(() => {
    const videosInProgress = videos.filter(
      v => v.uploadStatus === 'UPLOADING' || v.uploadStatus === 'PROCESSING'
    );

    if (videosInProgress.length === 0) return;

    const interval = setInterval(async () => {
      let hasChanges = false;
      
      for (const video of videosInProgress) {
        try {
          const status = await videosService.getUploadStatus(video.id);
          
          if (status.uploadStatus !== video.uploadStatus || status.uploadProgress !== video.uploadProgress) {
            hasChanges = true;
          }
          
          if (status.uploadStatus === 'READY') {
            toast({
              title: 'Vídeo pronto!',
              description: `O vídeo "${video.title}" está pronto para reprodução.`,
            });
          } else if (status.uploadStatus === 'ERROR') {
            toast({
              title: 'Erro no upload',
              description: status.uploadError || 'Ocorreu um erro ao processar o vídeo.',
              variant: 'destructive',
            });
          }
        } catch (error) {
          console.error('Erro ao verificar status:', error);
        }
      }
      
      if (hasChanges) {
        await loadVideos();
      }
    }, 3000); // Verificar a cada 3 segundos

    return () => clearInterval(interval);
  }, [videos, loadVideos, toast]);

  // Reordenar vídeos (drag and drop)
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(videos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Atualizar UI imediatamente
    setVideos(items);

    try {
      // Enviar nova ordem para API
      const updates = items.map((video, index) => ({
        id: video.id,
        order: index + 1,
      }));

      await videosService.reorder(moduleId, { videoOrders: updates });

      toast({
        title: 'Sucesso',
        description: 'Ordem dos vídeos atualizada!',
      });
    } catch (error) {
      console.error('Erro ao reordenar vídeos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reordenar os vídeos.',
        variant: 'destructive',
      });
      // Reverter mudança
      await loadVideos();
    }
  };

  // Publicar/despublicar vídeo
  const handleTogglePublish = async (videoId: string) => {
    try {
      await videosService.togglePublish(videoId);
      toast({
        title: 'Sucesso',
        description: 'Status do vídeo atualizado!',
      });
      await loadVideos();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status do vídeo.',
        variant: 'destructive',
      });
    }
  };

  // Deletar vídeo
  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Tem certeza que deseja deletar este vídeo? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await videosService.delete(videoId);
      toast({
        title: 'Sucesso',
        description: 'Vídeo deletado com sucesso!',
      });
      await loadVideos();
    } catch (error) {
      console.error('Erro ao deletar vídeo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível deletar o vídeo.',
        variant: 'destructive',
      });
    }
  };

  // Sincronizar vídeo com Cloudflare
  const handleSyncVideo = async (videoId: string) => {
    try {
      await videosService.sync(videoId);
      toast({
        title: 'Sucesso',
        description: 'Vídeo sincronizado com sucesso!',
      });
      await loadVideos();
    } catch (error) {
      console.error('Erro ao sincronizar vídeo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível sincronizar o vídeo.',
        variant: 'destructive',
      });
    }
  };

  // Formatar duração
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handlers de drag-and-drop para upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      if (!videoTitle) {
        setVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } else {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um arquivo de vídeo válido.',
        variant: 'destructive',
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!videoTitle) {
        setVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !videoTitle.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um arquivo e preencha o título.',
        variant: 'destructive',
      });
      return;
    }

    let pollingInterval: NodeJS.Timeout | null = null;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadPhase('uploading');

      // Obter próxima ordem
      const { nextOrder } = await videosService.getNextOrder(moduleId);

      // Fazer upload do vídeo (Fase 1: 0-50%)
      const video = await videosService.uploadFile(
        moduleId,
        selectedFile,
        {
          title: videoTitle,
          description: videoDescription || undefined,
          order: nextOrder,
        },
        (httpProgress) => {
          // Mapear progresso HTTP para 0-50%
          const mappedProgress = Math.round(httpProgress * 0.5);
          setUploadProgress(mappedProgress);
        }
      );

      // Fase 2: Monitorar progresso TUS (50-100%)
      setUploadPhase('processing');
      setUploadProgress(50);

      // Iniciar polling para pegar progresso TUS do backend
      pollingInterval = setInterval(async () => {
        try {
          const status = await videosService.getUploadStatus(video.id);
          
          // Mapear progresso TUS (0-100%) para 50-100% da barra
          const tusProgress = status.uploadProgress || 0;
          const mappedProgress = 50 + Math.round(tusProgress * 0.5);
          setUploadProgress(mappedProgress);

          // Se completou ou deu erro, parar polling
          if (status.uploadStatus === 'PROCESSING' || status.uploadStatus === 'READY' || status.uploadStatus === 'ERROR') {
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }

            if (status.uploadStatus === 'PROCESSING' || status.uploadStatus === 'READY') {
              setUploadProgress(100);
              toast({
                title: 'Upload concluído!',
                description: 'O vídeo está sendo processado pelo Cloudflare.',
              });
            }

            // Resetar estado e fechar modal
            setIsUploadModalOpen(false);
            setSelectedFile(null);
            setVideoTitle('');
            setVideoDescription('');
            setUploadProgress(0);
            setUploadPhase('idle');
            setIsUploading(false);

            // Recarregar lista de vídeos
            await loadVideos();
          }
        } catch (error) {
          console.error('Erro ao verificar progresso:', error);
        }
      }, 1000); // Verificar a cada 1 segundo

    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer o upload do vídeo.',
        variant: 'destructive',
      });
      setUploadPhase('idle');
      setIsUploading(false);
      
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    }
  };

  const openUploadModal = () => {
    setIsUploadModalOpen(true);
    setSelectedFile(null);
    setVideoTitle('');
    setVideoDescription('');
    setUploadProgress(0);
    setUploadPhase('idle');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!module) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/admin/courses/${module.courseId}/edit`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Vídeos do Módulo</h1>
            <p className="text-muted-foreground">
              {module.title}
            </p>
          </div>
        </div>
        <Button onClick={openUploadModal}>
          <Upload className="mr-2 h-4 w-4" />
          Upload de Vídeo
        </Button>
      </div>

      {/* Lista de Vídeos */}
      <Card>
        <CardHeader>
          <CardTitle>Vídeos</CardTitle>
          <CardDescription>
            Gerencie os vídeos deste módulo. Arraste para reordenar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingVideos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Nenhum vídeo adicionado ainda
              </p>
              <Button
                variant="outline"
                onClick={openUploadModal}
              >
                <Upload className="mr-2 h-4 w-4" />
                Fazer Upload do Primeiro Vídeo
              </Button>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="videos">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {videos.map((video, index) => (
                      <Draggable
                        key={video.id}
                        draggableId={video.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`
                              flex items-center gap-4 p-4 border rounded-lg bg-card
                              ${snapshot.isDragging ? 'shadow-lg' : ''}
                              ${video.uploadStatus === 'ERROR' ? 'border-destructive/50 bg-destructive/5' : ''}
                            `}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="h-5 w-5 text-muted-foreground" />
                            </div>

                            {/* Thumbnail */}
                            {video.thumbnailUrl ? (
                              <div className="w-32 h-18 rounded overflow-hidden bg-muted flex-shrink-0">
                                <img
                                  src={video.thumbnailUrl}
                                  alt={video.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-32 h-18 rounded overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                                <FileVideo className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-sm font-medium text-muted-foreground">
                                  Vídeo {video.order}
                                </span>
                                <UploadStatusBadge status={video.uploadStatus} progress={video.uploadProgress} />
                                {video.uploadStatus === 'READY' && (
                                  <Badge variant={video.isPublished ? 'default' : 'secondary'}>
                                    {video.isPublished ? 'Publicado' : 'Rascunho'}
                                  </Badge>
                                )}
                                {video.duration && video.duration > 0 && (
                                  <Badge variant="outline">
                                    {formatDuration(video.duration)}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-semibold truncate">{video.title}</h3>
                              {video.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {video.description}
                                </p>
                              )}
                              {video.uploadStatus === 'ERROR' && video.uploadError && (
                                <p className="text-sm text-destructive mt-1">
                                  Erro: {video.uploadError}
                                </p>
                              )}
                              {(video.uploadStatus === 'UPLOADING' || video.uploadStatus === 'PROCESSING') && (
                                <div className="mt-2">
                                  <Progress value={video.uploadProgress} className="h-1" />
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {video.uploadStatus === 'PROCESSING' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSyncVideo(video.id)}
                                  title="Sincronizar com Cloudflare"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              )}
                              {video.uploadStatus === 'READY' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleTogglePublish(video.id)}
                                    title={video.isPublished ? 'Despublicar' : 'Publicar'}
                                  >
                                    {video.isPublished ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.push(`/admin/modules/${moduleId}/videos/${video.id}/edit`)}
                                    title="Editar vídeo"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteVideo(video.id)}
                                title="Deletar vídeo"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Modal de Upload */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Upload de Vídeo</DialogTitle>
            <DialogDescription>
              Faça upload de um vídeo para este módulo. O processamento acontece em segundo plano.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Área de Drag and Drop */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                ${selectedFile ? 'bg-muted/50' : ''}
              `}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <FileVideo className="h-12 w-12 mx-auto text-primary" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remover
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="font-medium">
                    Arraste um vídeo aqui ou clique para selecionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Formatos suportados: MP4, MOV, AVI, etc. (até 50GB)
                  </p>
                </div>
              )}
            </div>

            {/* Campos do formulário */}
            {selectedFile && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Título do Vídeo *
                  </label>
                  <Input
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="Ex: Introdução ao React"
                    disabled={isUploading}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Descrição (Opcional)
                  </label>
                  <Textarea
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    placeholder="Descreva o conteúdo do vídeo..."
                    className="min-h-[100px]"
                    disabled={isUploading}
                  />
                </div>

                {/* Progress Bar */}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        {uploadProgress < 50 
                          ? 'Enviando para o servidor...' 
                          : uploadProgress < 100
                          ? 'Enviando para o Cloudflare...'
                          : 'Finalizando...'}
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                    <p className="text-xs text-muted-foreground">
                      {uploadProgress < 50 
                        ? 'Fase 1/2: Upload HTTP para o servidor'
                        : uploadProgress < 100
                        ? 'Fase 2/2: Upload TUS para o Cloudflare Stream'
                        : 'Upload concluído!'}
                    </p>
                  </div>
                )}

                {/* Botões */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsUploadModalOpen(false)}
                    disabled={isUploading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || !videoTitle.trim()}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Fazer Upload
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
