'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Loader2, 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  GripVertical, 
  Video as VideoIcon,
  Upload,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Clock,
  FileVideo,
  X,
  Link2,
  Pencil
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { modulesService, videosService } from '@/lib/api';
import type { Module, Video, VideoUploadStatus } from '@/lib/types/course.types';
import { ThumbnailUpload } from '@/components/admin/thumbnail-upload';
import { VideoMaterialsManager } from '@/components/admin/video-materials-manager';
import { VideoTranscriptManager } from '@/components/admin/video-transcript-manager';

const moduleFormSchema = z.object({
  title: z.string().min(3, 'O título deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
});

type ModuleFormValues = z.infer<typeof moduleFormSchema>;

// Componente de status do vídeo
function VideoStatusBadge({ status }: { status: VideoUploadStatus }) {
  const statusConfig = {
    PENDING: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
    UPLOADING: { label: 'Enviando', variant: 'default' as const, icon: Upload },
    PROCESSING: { label: 'Processando', variant: 'default' as const, icon: Loader2 },
    READY: { label: 'Pronto', variant: 'default' as const, icon: CheckCircle },
    ERROR: { label: 'Erro', variant: 'destructive' as const, icon: AlertCircle },
  };

  const config = statusConfig[status] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className={`h-3 w-3 ${status === 'PROCESSING' || status === 'UPLOADING' ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  );
}

// Componente de item de vídeo arrastável
function VideoItem({ 
  video, 
  onEdit,
  onDelete, 
  onTogglePublish,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: { 
  video: Video;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragging: boolean;
}) {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex items-center gap-3 p-3 bg-background border rounded-lg transition-all ${
        isDragging ? 'opacity-50 border-dashed border-primary' : 'hover:bg-muted/50'
      }`}
    >
      {/* Handle de arrasto */}
      <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Ordem */}
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
        {video.order}
      </div>

      {/* Thumbnail ou ícone */}
      <div className="w-16 h-10 bg-muted rounded flex items-center justify-center overflow-hidden">
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <FileVideo className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Informações */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{video.title}</p>
        <p className="text-sm text-muted-foreground">
          Duração: {formatDuration(video.duration)}
        </p>
      </div>

      {/* Status */}
      <VideoStatusBadge status={video.uploadStatus} />

      {/* Botão editar */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onEdit}
        title="Editar detalhes"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      {/* Botão publicar/despublicar */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onTogglePublish}
        title={video.isPublished ? 'Despublicar' : 'Publicar'}
        disabled={video.uploadStatus !== 'READY'}
      >
        {video.isPublished ? (
          <Eye className="h-4 w-4 text-green-600" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      {/* Botão deletar */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Componente de upload de vídeo
function VideoUploadDialog({
  open,
  onOpenChange,
  moduleId,
  nextOrder,
  onUploadComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  nextOrder: number;
  onUploadComplete: (video: Video) => void;
}) {
  const { toast } = useToast();
  const [uploadMode, setUploadMode] = useState<'file' | 'url' | 'embed'>('file');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset ao fechar
  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setUploadMode('file');
      setTitle('');
      setDescription('');
      setFile(null);
      setVideoUrl('');
      setEmbedUrl('');
      setThumbnailUrl('');
      setUploadProgress(0);
      setUploadStatus('');
    }
    onOpenChange(isOpen);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-preencher título com nome do arquivo (sem extensão)
      if (!title) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast({
        title: 'Erro',
        description: 'Selecione um arquivo e informe o título',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const video = await videosService.uploadVideoTusDirect(
        moduleId,
        file,
        {
          title: title.trim(),
          description: description.trim() || undefined,
          thumbnailUrl: thumbnailUrl || undefined,
          order: nextOrder,
        } as any,
        (progress) => {
          setUploadProgress(progress);
        },
        (status, message) => {
          setUploadStatus(message || status);
        }
      );

      toast({
        title: 'Upload iniciado',
        description: 'O vídeo está sendo processado pelo Cloudflare.',
      });

      onUploadComplete(video);
      handleClose(false);
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro no upload',
        description: error.message || 'Não foi possível fazer o upload do vídeo.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitFromUrl = async () => {
    if (!videoUrl.trim() || !title.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha a URL e o título do vídeo',
        variant: 'destructive',
      });
      return;
    }

    if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
      toast({
        title: 'URL inválida',
        description: 'A URL deve começar com http:// ou https://',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);

      const video = await videosService.createFromUrl(moduleId, videoUrl, {
        title: title.trim(),
        description: description.trim() || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        order: nextOrder,
      } as any);

      toast({
        title: 'Vídeo adicionado!',
        description: 'O Cloudflare está baixando e processando o vídeo.',
      });

      onUploadComplete(video);
      handleClose(false);
    } catch (error: any) {
      console.error('Erro ao criar vídeo da URL:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o vídeo a partir da URL.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Vídeo</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo ou insira uma URL externa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Toggle entre Upload, URL e Embed */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={uploadMode === 'file' ? 'default' : 'ghost'}
              className="flex-1 text-xs px-2"
              onClick={() => {
                setUploadMode('file');
                setVideoUrl('');
                setEmbedUrl('');
              }}
              disabled={isUploading}
            >
              <Upload className="mr-1 h-3 w-3" />
              Upload
            </Button>
            <Button
              variant={uploadMode === 'url' ? 'default' : 'ghost'}
              className="flex-1 text-xs px-2"
              onClick={() => {
                setUploadMode('url');
                setFile(null);
                setEmbedUrl('');
              }}
              disabled={isUploading}
            >
              <Link2 className="mr-1 h-3 w-3" />
              URL Direta
            </Button>
            <Button
              variant={uploadMode === 'embed' ? 'default' : 'ghost'}
              className="flex-1 text-xs px-2"
              onClick={() => {
                setUploadMode('embed');
                setFile(null);
                setVideoUrl('');
              }}
              disabled={isUploading}
            >
              <VideoIcon className="mr-1 h-3 w-3" />
              Embed
            </Button>
          </div>

          {/* Modo: Upload de Arquivo */}
          {uploadMode === 'file' && (
            <>
              {/* Seleção de arquivo */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Arquivo de Vídeo *</label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    file ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-muted-foreground/25 hover:border-primary'
                  }`}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isUploading}
                  />
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileVideo className="h-8 w-8 text-green-600" />
                      <div className="text-left">
                        <p className="font-medium truncate max-w-[250px]">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      {!isUploading && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Clique para selecionar ou arraste um vídeo
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        MP4, MOV, AVI, MKV (até 30GB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Título */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Título *</label>
                <Input
                  placeholder="Ex: Aula 01 - Introdução"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isUploading}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <Textarea
                  placeholder="Descreva o conteúdo do vídeo..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isUploading}
                  rows={3}
                />
              </div>

              {/* Thumbnail */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Thumbnail do Vídeo (opcional)</label>
                <ThumbnailUpload
                  value={thumbnailUrl}
                  onChange={setThumbnailUrl}
                  aspectRatio="horizontal"
                  label="Thumbnail"
                />
                <p className="text-xs text-muted-foreground">
                  Se não fornecer, o Cloudflare gerará automaticamente
                </p>
              </div>

              {/* Progresso de upload */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{uploadStatus || 'Enviando...'}</span>
                    <span>{uploadProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleClose(false)}
                  disabled={isUploading}
                >
                  Cancelar
                </Button>
                <Button onClick={handleUpload} disabled={!file || !title.trim() || isUploading}>
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
              </DialogFooter>
            </>
          )}

          {/* Modo: URL Externa */}
          {uploadMode === 'url' && (
            <>
              {/* URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium">URL do Vídeo *</label>
                <Input
                  placeholder="https://exemplo.com/video.mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground">
                  Insira a URL direta para o arquivo de vídeo
                </p>
              </div>

              {/* Título */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Título *</label>
                <Input
                  placeholder="Ex: Aula 01 - Introdução"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isUploading}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <Textarea
                  placeholder="Descreva o conteúdo do vídeo..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isUploading}
                  rows={3}
                />
              </div>

              {/* Loading */}
              {isUploading && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Enviando URL para o Cloudflare...</span>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleClose(false)}
                  disabled={isUploading}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmitFromUrl} 
                  disabled={!videoUrl.trim() || !title.trim() || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Adicionar da URL
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Modo: Embed Externo */}
          {uploadMode === 'embed' && (
            <>
              {/* URL do Embed */}
              <div className="space-y-2">
                <label className="text-sm font-medium">URL do Embed *</label>
                <Input
                  placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground">
                  Cole a URL do YouTube, Vimeo ou outra plataforma de vídeo
                </p>
              </div>

              {/* Título */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Título *</label>
                <Input
                  placeholder="Ex: Aula 01 - Introdução"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isUploading}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <Textarea
                  placeholder="Descreva o conteúdo do vídeo..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isUploading}
                  rows={3}
                />
              </div>

              {/* Info box */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>ℹ️ Sobre Embed:</strong> O vídeo será exibido diretamente da plataforma original (YouTube, Vimeo, etc).
                  Não será hospedado no Cloudflare.
                </p>
              </div>

              {/* Loading */}
              {isUploading && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Salvando vídeo embed...</span>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleClose(false)}
                  disabled={isUploading}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={async () => {
                    if (!embedUrl.trim() || !title.trim()) {
                      toast({
                        title: 'Erro',
                        description: 'Preencha a URL do embed e o título',
                        variant: 'destructive',
                      });
                      return;
                    }
                    if (!embedUrl.startsWith('http://') && !embedUrl.startsWith('https://')) {
                      toast({
                        title: 'URL inválida',
                        description: 'A URL deve começar com http:// ou https://',
                        variant: 'destructive',
                      });
                      return;
                    }
                    try {
                      setIsUploading(true);
                      const video = await videosService.createFromEmbed(moduleId, embedUrl, {
                        title: title.trim(),
                        description: description.trim() || undefined,
                        thumbnailUrl: thumbnailUrl || undefined,
                        order: nextOrder,
                      } as any);
                      toast({
                        title: 'Vídeo adicionado!',
                        description: 'O vídeo embed foi salvo com sucesso.',
                      });
                      onUploadComplete(video);
                      handleClose(false);
                    } catch (error: any) {
                      console.error('Erro ao criar vídeo embed:', error);
                      toast({
                        title: 'Erro',
                        description: error.message || 'Não foi possível criar o vídeo embed.',
                        variant: 'destructive',
                      });
                    } finally {
                      setIsUploading(false);
                    }
                  }} 
                  disabled={!embedUrl.trim() || !title.trim() || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <VideoIcon className="mr-2 h-4 w-4" />
                      Adicionar Embed
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente principal
export default function EditModulePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const courseId = params.id as string;
  const moduleId = params.moduleId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [module, setModule] = useState<Module | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [draggedVideoId, setDraggedVideoId] = useState<string | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [deleteConfirmVideo, setDeleteConfirmVideo] = useState<Video | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  // Carregar dados do módulo
  useEffect(() => {
    const abortController = new AbortController();
    
    const loadModule = async () => {
      try {
        setIsLoading(true);
        const data = await modulesService.findOne(moduleId);
        
        if (!abortController.signal.aborted) {
          setModule(data);
          form.reset({
            title: data.title,
            description: data.description || '',
          });
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || error.name === 'CanceledError') return;
        console.error('Erro ao carregar módulo:', error);
        if (!abortController.signal.aborted) {
          toast({
            title: 'Erro',
            description: 'Não foi possível carregar o módulo.',
            variant: 'destructive',
          });
          router.push(`/admin/courses/${courseId}/edit`);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadModule();
    
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  // Carregar vídeos do módulo
  const loadVideos = useCallback(async () => {
    try {
      setIsLoadingVideos(true);
      const data = await videosService.findAll(moduleId);
      setVideos(data.sort((a, b) => a.order - b.order));
    } catch (error: any) {
      if (error.name === 'CanceledError') return;
      console.error('Erro ao carregar vídeos:', error);
    } finally {
      setIsLoadingVideos(false);
    }
  }, [moduleId]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Polling para atualizar status de vídeos em processamento
  useEffect(() => {
    const checkProcessingVideos = async () => {
      const processingVideos = videos.filter(
        v => v.uploadStatus === 'UPLOADING' || v.uploadStatus === 'PROCESSING'
      );

      if (processingVideos.length === 0) return;

      for (const video of processingVideos) {
        try {
          const status = await videosService.getUploadStatus(video.id);
          if (status.uploadStatus !== video.uploadStatus) {
            setVideos(prev => prev.map(v => 
              v.id === video.id 
                ? { ...v, uploadStatus: status.uploadStatus, uploadProgress: status.uploadProgress }
                : v
            ));
          }
        } catch (error) {
          console.error('Erro ao verificar status:', error);
        }
      }
    };

    const interval = setInterval(checkProcessingVideos, 5000);

    return () => clearInterval(interval);
  }, [videos]);

  // Submeter formulário do módulo
  const onSubmit = async (values: ModuleFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Se description está vazia, enviar null para limpar o campo
      const description = values.description?.trim();
      
      await modulesService.update(moduleId, {
        title: values.title,
        description: description || null,
      } as any);
      
      // Recarregar módulo para confirmar mudanças
      const updatedModule = await modulesService.findOne(moduleId);
      setModule(updatedModule);
      form.reset({
        title: updatedModule.title,
        description: updatedModule.description || '',
      });
      
      toast({
        title: 'Sucesso',
        description: 'Módulo atualizado com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao atualizar módulo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o módulo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers de drag and drop
  const handleDragStart = (videoId: string) => (e: React.DragEvent) => {
    setDraggedVideoId(videoId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetVideoId: string) => async (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedVideoId || draggedVideoId === targetVideoId) {
      setDraggedVideoId(null);
      return;
    }

    const draggedIndex = videos.findIndex(v => v.id === draggedVideoId);
    const targetIndex = videos.findIndex(v => v.id === targetVideoId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedVideoId(null);
      return;
    }

    // Reordenar localmente
    const newVideos = [...videos];
    const [removed] = newVideos.splice(draggedIndex, 1);
    newVideos.splice(targetIndex, 0, removed);

    // Atualizar ordens
    const reorderedVideos = newVideos.map((v, index) => ({
      ...v,
      order: index + 1,
    }));

    setVideos(reorderedVideos);
    setDraggedVideoId(null);

    // Salvar no backend
    try {
      await videosService.reorder(moduleId, {
        videoOrders: reorderedVideos.map(v => ({ id: v.id, order: v.order })),
      });
      toast({
        title: 'Sucesso',
        description: 'Ordem dos vídeos atualizada!',
      });
    } catch (error) {
      console.error('Erro ao reordenar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reordenar os vídeos.',
        variant: 'destructive',
      });
      // Recarregar para reverter
      loadVideos();
    }
  };

  // Toggle publicar/despublicar
  const handleTogglePublish = async (videoId: string) => {
    try {
      const updatedVideo = await videosService.togglePublish(videoId);
      setVideos(prev => prev.map(v => 
        v.id === videoId ? { ...v, isPublished: updatedVideo.isPublished } : v
      ));
      toast({
        title: 'Sucesso',
        description: updatedVideo.isPublished ? 'Vídeo publicado!' : 'Vídeo despublicado!',
      });
    } catch (error) {
      console.error('Erro ao alterar publicação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status de publicação.',
        variant: 'destructive',
      });
    }
  };

  // Deletar vídeo
  const handleDeleteVideo = async () => {
    if (!deleteConfirmVideo) return;

    try {
      setIsDeleting(true);
      await videosService.delete(deleteConfirmVideo.id);
      setVideos(prev => prev.filter(v => v.id !== deleteConfirmVideo.id));
      toast({
        title: 'Sucesso',
        description: 'Vídeo deletado com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível deletar o vídeo.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmVideo(null);
    }
  };

  // Callback quando upload completa
  const handleUploadComplete = (video: Video) => {
    setVideos(prev => [...prev, video].sort((a, b) => a.order - b.order));
  };

  // Próxima ordem disponível
  const nextOrder = videos.length > 0 
    ? Math.max(...videos.map(v => v.order)) + 1 
    : 1;

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
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Editar Módulo</h1>
          <p className="text-gray-600 mt-2">
            Atualize as informações e gerencie os vídeos do módulo
          </p>
        </div>
      </div>

      {/* Formulário do Módulo */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Informações do Módulo</CardTitle>
          <CardDescription>
            Atualize o título e a descrição do módulo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título do Módulo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Introdução à Cirurgia" {...field} />
                    </FormControl>
                    <FormDescription>
                      O título principal do módulo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o conteúdo do módulo..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Uma breve descrição do que será abordado neste módulo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator className="my-6" />

              {/* Thumbnails do Módulo */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Thumbnails do Módulo</h3>
                  <p className="text-sm text-muted-foreground">
                    Adicione imagens de capa para o módulo em diferentes orientações
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Thumbnail Horizontal */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Thumbnail Horizontal (16:9)</label>
                    <ThumbnailUpload
                      value={module?.thumbnailHorizontal || ''}
                      onChange={async (url) => {
                        try {
                          await modulesService.update(moduleId, {
                            thumbnailHorizontal: url || null,
                          } as any);
                          setModule(prev => prev ? {...prev, thumbnailHorizontal: url} : null);
                          toast({
                            title: 'Sucesso',
                            description: 'Thumbnail horizontal atualizada!',
                          });
                        } catch (error) {
                          console.error('Erro:', error);
                          toast({
                            title: 'Erro',
                            description: 'Não foi possível atualizar a thumbnail.',
                            variant: 'destructive',
                          });
                        }
                      }}
                      aspectRatio="horizontal"
                      label="Horizontal"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recomendado: 1920x1080px (16:9)
                    </p>
                  </div>

                  {/* Thumbnail Vertical */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Thumbnail Vertical (9:16)</label>
                    <ThumbnailUpload
                      value={module?.thumbnailVertical || ''}
                      onChange={async (url) => {
                        try {
                          await modulesService.update(moduleId, {
                            thumbnailVertical: url || null,
                          } as any);
                          setModule(prev => prev ? {...prev, thumbnailVertical: url} : null);
                          toast({
                            title: 'Sucesso',
                            description: 'Thumbnail vertical atualizada!',
                          });
                        } catch (error) {
                          console.error('Erro:', error);
                          toast({
                            title: 'Erro',
                            description: 'Não foi possível atualizar a thumbnail.',
                            variant: 'destructive',
                          });
                        }
                      }}
                      aspectRatio="vertical"
                      label="Vertical"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recomendado: 1080x1920px (9:16)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Informações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Seção de Vídeos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <VideoIcon className="h-5 w-5" />
                Vídeos do Módulo
              </CardTitle>
              <CardDescription>
                Gerencie os vídeos deste módulo. Arraste para reordenar.
              </CardDescription>
            </div>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Vídeo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingVideos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <VideoIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum vídeo ainda</h3>
              <p className="text-muted-foreground mb-4">
                Adicione vídeos para começar a construir seu módulo.
              </p>
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Vídeo
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {videos.map((video) => (
                <VideoItem
                  key={video.id}
                  video={video}
                  onEdit={() => setEditingVideo(video)}
                  onDelete={() => setDeleteConfirmVideo(video)}
                  onTogglePublish={() => handleTogglePublish(video.id)}
                  onDragStart={handleDragStart(video.id)}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop(video.id)}
                  isDragging={draggedVideoId === video.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botão Voltar */}
      <div className="mt-8 flex justify-between">
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para o Curso
        </Button>
      </div>

      {/* Dialog de Upload */}
      <VideoUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        moduleId={moduleId}
        nextOrder={nextOrder}
        onUploadComplete={handleUploadComplete}
      />

      {/* Dialog de Edição de Vídeo */}
      <Dialog open={!!editingVideo} onOpenChange={(open) => !open && setEditingVideo(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Detalhes do Vídeo</DialogTitle>
            <DialogDescription>
              Atualize título, descrição, thumbnail e materiais didáticos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Informações Básicas</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium">Título *</label>
                <Input
                  value={editingVideo?.title || ''}
                  onChange={(e) => setEditingVideo(prev => prev ? {...prev, title: e.target.value} : null)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <Textarea
                  value={editingVideo?.description || ''}
                  onChange={(e) => setEditingVideo(prev => prev ? {...prev, description: e.target.value} : null)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Thumbnail (opcional)</label>
                <ThumbnailUpload
                  value={editingVideo?.thumbnailUrl || ''}
                  onChange={(url) => setEditingVideo(prev => prev ? {...prev, thumbnailUrl: url} : null)}
                  aspectRatio="horizontal"
                  label="Thumbnail"
                />
              </div>
            </div>

            {/* Materiais Didáticos */}
            {editingVideo && (
              <div className="border-t pt-4">
                <VideoMaterialsManager videoId={editingVideo.id} />
              </div>
            )}

            {/* Transcrição do Vídeo */}
            {editingVideo && (
              <div className="border-t pt-4">
                <VideoTranscriptManager videoId={editingVideo.id} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVideo(null)}>
              Cancelar
            </Button>
            <Button onClick={async () => {
              if (!editingVideo) return;
              try {
                await videosService.update(editingVideo.id, {
                  title: editingVideo.title,
                  description: editingVideo.description || undefined,
                  thumbnailUrl: editingVideo.thumbnailUrl || undefined,
                } as any);
                setVideos(prev => prev.map(v => v.id === editingVideo.id ? editingVideo : v));
                toast({ title: 'Sucesso', description: 'Vídeo atualizado!' });
                setEditingVideo(null);
              } catch (error) {
                console.error('Erro:', error);
                toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
              }
            }}>
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={!!deleteConfirmVideo} onOpenChange={() => setDeleteConfirmVideo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o vídeo &quot;{deleteConfirmVideo?.title}&quot;?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmVideo(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteVideo}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Vídeo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
