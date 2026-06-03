'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Plus, GripVertical, Pencil, Trash2, Upload, Eye, EyeOff, X, FileVideo, RefreshCw, AlertCircle, CheckCircle2, Clock, Link2, Sparkles, Wand2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import Hls from 'hls.js';
import type { DropResult } from '@hello-pangea/dnd';
import { R2PlaylistPicker } from '@/components/r2-playlist-picker';
import { ThumbnailUpload } from '@/components/admin/thumbnail-upload';
import { VideoMaterialsManager } from '@/components/admin/video-materials-manager';
import { VideoCaptionsManager } from '@/components/admin/video-captions-manager';
import { VideoQuizManager } from '@/components/admin/video-quiz-manager';
import { aiTextService } from '@/lib/api/ai-text.service';

const DragDropContext = dynamic(
  () => import('@hello-pangea/dnd').then((mod) => mod.DragDropContext),
  { ssr: false }
);
const Droppable = dynamic(
  () => import('@hello-pangea/dnd').then((mod) => mod.Droppable),
  { ssr: false }
);
const Draggable = dynamic(
  () => import('@hello-pangea/dnd').then((mod) => mod.Draggable),
  { ssr: false }
);

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { modulesService, videosService } from '@/lib/api';
import { getErrorMessage } from '@/lib/api/client';
import type { Module, Video, VideoUploadStatus } from '@/lib/types/course.types';

import { logger } from '@/lib/logger';

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
        <Badge variant="secondary" className="gap-1 bg-atlas-primary-soft text-blue-800">
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
  // Default R2 HLS: o upload de arquivo (Cloudflare Stream, legado) foi
  // removido da UI — arquivos novos sobem pelo /admin/r2-browser (→ inbox/ →
  // pipeline) e são registrados aqui pelo modo R2 HLS. O bloco do modo 'file'
  // permanece no código mas inacessível (débito a limpar na migração R2 100%).
  const [uploadMode, setUploadMode] = useState<'file' | 'url' | 'r2_hls'>('r2_hls');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');

  // Estados do modo R2 HLS (video ja processado pelo pipeline externo)
  const [r2HlsUrl, setR2HlsUrl] = useState('');
  const [r2Duration, setR2Duration] = useState('');
  const [r2CaptionsEmbedded, setR2CaptionsEmbedded] = useState(true);
  const [r2ThumbnailUrl, setR2ThumbnailUrl] = useState('');

  // Status do auto-detect de duração (parsing do master playlist via hls.js)
  const [r2DurationStatus, setR2DurationStatus] = useState<
    'idle' | 'loading' | 'ok' | 'error'
  >('idle');
  const [r2DurationManual, setR2DurationManual] = useState(false);
  const r2ProbeVideoRef = useRef<HTMLVideoElement | null>(null);
  const r2ProbeHlsRef = useRef<Hls | null>(null);

  // Status do auto-extract de thumbnail (ffmpeg server-side via HLS).
  // Marca-se "manual" se o admin upload um thumbnail manualmente ou usa
  // "Gerar com IA" — daí o auto-extract não sobrescreve.
  const [r2ThumbnailStatus, setR2ThumbnailStatus] = useState<
    'idle' | 'loading' | 'ok' | 'error'
  >('idle');
  const [r2ThumbnailManual, setR2ThumbnailManual] = useState(false);
  const r2ThumbnailAbortRef = useRef<AbortController | null>(null);

  // Após criar o vídeo R2 HLS, o modal entra em "modo edição" com
  // Materiais / Legendas / Quiz apontando pro vídeo recém-criado.
  // Reuso direto dos managers do fluxo "Editar Detalhes do Vídeo".
  const [createdR2Video, setCreatedR2Video] = useState<Video | null>(null);
  const [r2AiBusy, setR2AiBusy] = useState<
    'idle' | 'title' | 'description' | 'thumbnail'
  >('idle');

  // Carregar dados do módulo
  useEffect(() => {
    const loadModule = async () => {
      try {
        setIsLoading(true);
        const data = await modulesService.findOne(moduleId);
        setModule(data);
        await loadVideos();
      } catch (error) {
        logger.error('Erro ao carregar módulo:', error);
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
      logger.error('Erro ao carregar vídeos:', error);
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
          logger.error('Erro ao verificar status:', error);
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

      await videosService.reorder(moduleId, { videos: updates });

      toast({
        title: 'Sucesso',
        description: 'Ordem dos vídeos atualizada!',
      });
    } catch (error) {
      logger.error('Erro ao reordenar vídeos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reordenar os vídeos.',
        variant: 'destructive',
      });
      // Reverter mudança
      await loadVideos();
    }
  };

  // Publicar/despublicar vídeo — update OTIMISTA, sem refetch da lista.
  // Antes recarregava a lista inteira a cada clique (loadVideos), o que
  // (a) escondia a lista durante o loading — a tela "piscava" — e (b) ao
  // publicar várias aulas em série disparava um GET /modules/:id/videos por
  // clique, estourando o rate limit do backend (20/s) → 429. Agora só o
  // PATCH toggle-publish viaja; a UI reflete na hora e reconcilia com a
  // resposta do servidor. Sem toast de sucesso (o badge já é o feedback e
  // evita empilhar toasts numa publicação em série).
  const handleTogglePublish = async (videoId: string) => {
    setVideos((cur) =>
      cur.map((v) =>
        v.id === videoId ? { ...v, isPublished: !v.isPublished } : v,
      ),
    );
    try {
      const updated = await videosService.togglePublish(videoId);
      setVideos((cur) => cur.map((v) => (v.id === videoId ? updated : v)));
    } catch (error) {
      logger.error('Erro ao atualizar status:', error);
      // rollback: desfaz o toggle otimista só deste item (preserva os demais)
      setVideos((cur) =>
        cur.map((v) =>
          v.id === videoId ? { ...v, isPublished: !v.isPublished } : v,
        ),
      );
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
      logger.error('Erro ao deletar vídeo:', error);
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
      logger.error('Erro ao sincronizar vídeo:', error);
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

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadPhase('uploading');

      // Obter próxima ordem
      const { nextOrder } = await videosService.getNextOrder(moduleId);

      // NOVO: Upload TUS direto para Cloudflare (sem passar pelo backend)
      const video = await videosService.uploadVideoTusDirect(
        moduleId,
        selectedFile,
        {
          title: videoTitle,
          description: videoDescription || undefined,
          order: nextOrder,
        },
        // Callback de progresso
        (progress) => {
          setUploadProgress(Math.round(progress));
        },
        // Callback de status
        (status, message) => {
          logger.log(`[Upload] Status: ${status} - ${message}`);
          if (status === 'preparing') {
            setUploadPhase('uploading');
          } else if (status === 'uploading') {
            setUploadPhase('uploading');
          } else if (status === 'processing') {
            setUploadPhase('processing');
          }
        }
      );

      // Upload TUS concluído com sucesso!
      setUploadProgress(100);
      setUploadPhase('done');
      
      toast({
        title: 'Upload concluído!',
        description: 'O vídeo está sendo processado pelo Cloudflare. Você pode fechar esta janela.',
      });

      // Resetar estado e fechar modal após um breve delay
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        setVideoTitle('');
        setVideoDescription('');
        setUploadProgress(0);
        setUploadPhase('idle');
        setIsUploading(false);
      }, 1500);

      // Recarregar lista de vídeos
      await loadVideos();

    } catch (error: any) {
      logger.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro no upload',
        description: error.message || 'Não foi possível fazer o upload do vídeo.',
        variant: 'destructive',
      });
      setUploadPhase('idle');
      setIsUploading(false);
    }
  };

  const openUploadModal = () => {
    setIsUploadModalOpen(true);
    setUploadMode('file');
    setSelectedFile(null);
    setVideoUrl('');
    setVideoTitle('');
    setVideoDescription('');
    setUploadProgress(0);
    setUploadPhase('idle');
    setR2HlsUrl('');
    setR2Duration('');
    setR2CaptionsEmbedded(true);
    setR2ThumbnailUrl('');
    setR2DurationStatus('idle');
    setR2DurationManual(false);
    setR2ThumbnailStatus('idle');
    setR2ThumbnailManual(false);
    setCreatedR2Video(null);
    setR2AiBusy('idle');
  };

  // Auto-detect duration from master playlist when admin pastes a
  // valid .m3u8 URL. Mirrors the Cloudflare auto-fill flow so the
  // operator never needs to compute it manually. Falls back to a
  // manual input if probing fails (CORS, 404, malformed manifest).
  useEffect(() => {
    if (uploadMode !== 'r2_hls') return;
    if (r2DurationManual) return;

    const url = r2HlsUrl.trim();
    if (!url) {
      setR2Duration('');
      setR2DurationStatus('idle');
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      setR2DurationStatus('idle');
      return;
    }
    if (
      (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
      !parsed.pathname.endsWith('.m3u8')
    ) {
      setR2DurationStatus('idle');
      return;
    }

    let cancelled = false;
    setR2DurationStatus('loading');
    setR2Duration('');

    const cleanup = () => {
      if (r2ProbeHlsRef.current) {
        try { r2ProbeHlsRef.current.destroy(); } catch { /* noop */ }
        r2ProbeHlsRef.current = null;
      }
      if (r2ProbeVideoRef.current) {
        try { r2ProbeVideoRef.current.removeAttribute('src'); } catch { /* noop */ }
        r2ProbeVideoRef.current = null;
      }
    };

    const debounce = window.setTimeout(() => {
      if (cancelled) return;

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.crossOrigin = 'anonymous';
      r2ProbeVideoRef.current = video;

      const finish = (durationSec: number | null) => {
        if (cancelled) return;
        if (durationSec && Number.isFinite(durationSec) && durationSec > 0) {
          setR2Duration(String(Math.round(durationSec)));
          setR2DurationStatus('ok');
        } else {
          setR2DurationStatus('error');
        }
        cleanup();
      };

      const handleLoadedMetadata = () => {
        finish(video.duration);
      };
      const handleError = () => {
        logger.warn('[R2 HLS probe] erro ao carregar manifest:', url);
        finish(null);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      video.addEventListener('error', handleError, { once: true });

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false });
        r2ProbeHlsRef.current = hls;
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data?.fatal) {
            logger.warn('[R2 HLS probe] fatal hls error:', data.type, data.details);
            finish(null);
          }
        });
        hls.loadSource(url);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
      } else {
        finish(null);
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(debounce);
      cleanup();
    };
  }, [r2HlsUrl, uploadMode, r2DurationManual]);

  // Auto-extract thumbnail from the HLS playlist when admin pastes/picks
  // a valid .m3u8 in r2_hls mode AND has not manually set a thumbnail.
  // Backend runs ffmpeg server-side, uploads to R2, returns the public
  // URL — usually <2s end-to-end after the input segment is fetched.
  // Manual upload / "Gerar com IA" pin r2ThumbnailManual=true to avoid
  // surprise overwrites.
  useEffect(() => {
    if (uploadMode !== 'r2_hls') return;
    if (r2ThumbnailManual) return;

    const url = r2HlsUrl.trim();
    if (!url) {
      setR2ThumbnailStatus('idle');
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      setR2ThumbnailStatus('idle');
      return;
    }
    if (parsed.protocol !== 'https:' || !parsed.pathname.endsWith('.m3u8')) {
      setR2ThumbnailStatus('idle');
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    if (r2ThumbnailAbortRef.current) {
      r2ThumbnailAbortRef.current.abort();
    }
    r2ThumbnailAbortRef.current = controller;

    const debounce = window.setTimeout(async () => {
      if (cancelled) return;
      setR2ThumbnailStatus('loading');
      try {
        const { thumbnailUrl } = await videosService.extractThumbnailFromHls(
          moduleId,
          url,
        );
        if (cancelled) return;
        // Cache-bust se R2 já tinha um auto-thumbnail.jpg de uma
        // tentativa anterior — sem isso o <img> do ThumbnailUpload
        // mostraria a versão velha.
        setR2ThumbnailUrl(`${thumbnailUrl}?v=${Date.now()}`);
        setR2ThumbnailStatus('ok');
      } catch (err) {
        if (cancelled || (err as Error)?.name === 'CanceledError') return;
        logger.warn('[R2 HLS thumbnail] auto-extract falhou:', err);
        setR2ThumbnailStatus('error');
      }
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(debounce);
      controller.abort();
    };
  }, [r2HlsUrl, uploadMode, r2ThumbnailManual, moduleId]);

  // Handler: criar video registrando um master playlist HLS ja existente
  // em R2. Backend nao processa — so grava o row com uploadStatus=READY.
  const handleSubmitFromR2Hls = async () => {
    const trimmedUrl = r2HlsUrl.trim();
    const trimmedTitle = videoTitle.trim();
    const durationNum = Number(r2Duration);

    if (!trimmedUrl || !trimmedTitle) {
      toast({
        title: 'Erro',
        description: 'Preencha a URL do playlist e o título.',
        variant: 'destructive',
      });
      return;
    }

    // Validacao client-side: URL https:// terminando em .m3u8 (com ou sem query).
    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('protocol');
      }
      if (!parsed.pathname.endsWith('.m3u8')) {
        throw new Error('extension');
      }
    } catch {
      toast({
        title: 'URL inválida',
        description: 'A URL deve terminar em .m3u8 e começar com http(s)://.',
        variant: 'destructive',
      });
      return;
    }

    if (!Number.isFinite(durationNum) || durationNum <= 0) {
      toast({
        title: 'Duração inválida',
        description: 'Informe a duração em segundos (valor inteiro > 0).',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadPhase('uploading');

      const created = await videosService.createFromR2Hls(moduleId, {
        hlsUrl: trimmedUrl,
        duration: Math.round(durationNum),
        captionsEmbedded: r2CaptionsEmbedded,
        title: trimmedTitle,
        description: videoDescription.trim() || undefined,
        thumbnailUrl: r2ThumbnailUrl.trim() || undefined,
      });

      setUploadPhase('done');
      setCreatedR2Video(created);
      setIsUploading(false);
      toast({
        title: 'Vídeo registrado!',
        description: 'Agora adicione materiais, legendas e quiz.',
      });

      await loadVideos();
      return;
    } catch (error: unknown) {
      logger.error('[R2 HLS] falha ao registrar video:', error);
      // Usa getErrorMessage pra extrair a mensagem do backend (response.data.message)
      // em vez do generico "Request failed with status code XXX" do axios. Casos
      // de 409 trazem detalhes uteis como o id do Video conflitante.
      const msg = getErrorMessage(error);
      toast({
        title: 'Erro',
        description: msg,
        variant: 'destructive',
      });
      setUploadPhase('idle');
      setIsUploading(false);
    }
  };

  // Handler para criar vídeo a partir de URL
  const handleSubmitFromUrl = async () => {
    if (!videoUrl.trim() || !videoTitle.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha a URL e o título do vídeo.',
        variant: 'destructive',
      });
      return;
    }

    // Validar que a URL começa com http/https
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
      setUploadPhase('uploading');

      // Obter próxima ordem
      const { nextOrder } = await videosService.getNextOrder(moduleId);

      // Criar vídeo a partir da URL
      await videosService.createFromUrl(moduleId, videoUrl, {
        title: videoTitle,
        description: videoDescription || undefined,
        order: nextOrder,
      });

      setUploadPhase('done');
      
      toast({
        title: 'Vídeo adicionado!',
        description: 'O Cloudflare está baixando e processando o vídeo da URL fornecida.',
      });

      // Resetar estado e fechar modal
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setVideoUrl('');
        setVideoTitle('');
        setVideoDescription('');
        setUploadPhase('idle');
        setIsUploading(false);
      }, 1500);

      // Recarregar lista de vídeos
      await loadVideos();

    } catch (error: any) {
      logger.error('Erro ao criar vídeo da URL:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o vídeo a partir da URL.',
        variant: 'destructive',
      });
      setUploadPhase('idle');
      setIsUploading(false);
    }
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
    <div className="w-full py-8 px-4 sm:px-6 lg:px-8">
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
            <div className="atlas-caps text-atlas-muted mb-1.5">ADMIN · VÍDEOS</div>
            <h1 className="font-serif text-[22px] sm:text-[26px] font-medium tracking-[-0.015em] leading-[1.15] text-atlas-ink">Vídeos do Módulo</h1>
            <p className="text-[13px] text-atlas-muted mt-1">
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
                              flex items-center gap-4 p-4 border rounded-lg bg-white
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
                                {video.uploadStatus === 'READY' && video.duration && video.duration > 0 && (
                                  <Badge variant="outline" className="gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(video.duration)}
                                  </Badge>
                                )}
                                {video.uploadStatus === 'READY' && (!video.duration || video.duration === 0) && (
                                  <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
                                    <AlertCircle className="h-3 w-3" />
                                    {video.externalUrl || video.videoSource !== 'cloudflare' ? 'Vídeo externo' : 'Sem duração'}
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
                              {/* Só mostrar sync para vídeos do Cloudflare (não embed) */}
                              {!video.externalUrl && video.videoSource === 'cloudflare' && (video.uploadStatus === 'PROCESSING' || (video.uploadStatus === 'READY' && (!video.duration || video.duration === 0))) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSyncVideo(video.id)}
                                  title="Sincronizar metadados com Cloudflare"
                                  className={video.uploadStatus === 'READY' && (!video.duration || video.duration === 0) ? 'text-amber-600 hover:text-amber-700' : ''}
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
                                    className={
                                      video.isPublished
                                        ? 'group hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400'
                                        : undefined
                                    }
                                  >
                                    {video.isPublished ? (
                                      <>
                                        <Eye className="h-4 w-4 group-hover:hidden" />
                                        <EyeOff className="h-4 w-4 hidden group-hover:block" />
                                      </>
                                    ) : (
                                      <EyeOff className="h-4 w-4" />
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
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white">
          <DialogHeader>
            <DialogTitle>
              {createdR2Video ? 'Finalize o conteúdo do vídeo' : 'Adicionar Vídeo'}
            </DialogTitle>
            <DialogDescription>
              {createdR2Video
                ? 'O vídeo foi registrado. Adicione materiais, legendas e quiz.'
                : 'Adicione um vídeo ao módulo. Você pode fazer upload de um arquivo ou inserir uma URL externa.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Toggle entre URL e R2 HLS — escondido após criação.
                "Upload de Arquivo" (Cloudflare Stream legado) removido: arquivos
                novos sobem pelo /admin/r2-browser e entram aqui via R2 HLS. */}
            {!createdR2Video && (
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <Button
                variant={uploadMode === 'url' ? 'default' : 'ghost'}
                className="flex-1"
                onClick={() => {
                  setUploadMode('url');
                  setSelectedFile(null);
                }}
                disabled={isUploading}
              >
                <Link2 className="mr-2 h-4 w-4" />
                URL Externa
              </Button>
              <Button
                variant={uploadMode === 'r2_hls' ? 'default' : 'ghost'}
                className="flex-1"
                onClick={() => {
                  setUploadMode('r2_hls');
                  setSelectedFile(null);
                  setVideoUrl('');
                }}
                disabled={isUploading}
                title="Registrar master playlist .m3u8 ja processado pelo pipeline externo"
              >
                <FileVideo className="mr-2 h-4 w-4" />
                R2 HLS
              </Button>
            </div>
            )}

            {/* Modo: Upload de Arquivo */}
            {uploadMode === 'file' && (
              <>
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

                {/* Campos do formulário para arquivo */}
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
                            {uploadProgress < 100 
                              ? 'Enviando para o Cloudflare...'
                              : 'Finalizando...'}
                          </span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} />
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
              </>
            )}

            {/* Modo: URL Externa */}
            {uploadMode === 'url' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    URL do Vídeo *
                  </label>
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://exemplo.com/video.mp4"
                    disabled={isUploading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Insira a URL direta para o arquivo de vídeo (deve terminar em .mp4, .mov, etc.)
                  </p>
                </div>

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

                {/* Loading indicator para URL */}
                {isUploading && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">
                      Enviando URL para o Cloudflare processar...
                    </span>
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
                    onClick={handleSubmitFromUrl}
                    disabled={isUploading || !videoTitle.trim() || !videoUrl.trim()}
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
                </div>
              </>
            )}

            {/* Modo: Importar de R2 HLS (pipeline externo ja processou) */}
            {uploadMode === 'r2_hls' && !createdR2Video && (
              <>
                <div className="p-3 rounded-lg bg-atlas-primary-soft border border-atlas-primary/30 text-sm text-blue-900">
                  Use esta opção para registrar um <strong>master playlist
                  .m3u8</strong> que já saiu do pipeline externo (FFmpeg +
                  Whisper em R2). O backend não processa nada — só grava
                  o vídeo como pronto.
                  <br />
                  <span className="text-xs">
                    Para subir um <strong>arquivo novo</strong>, faça o upload
                    pelo <strong>R2 Browser</strong> (vai pro pipeline) e depois
                    registre a aula aqui.
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Buscar pasta no R2
                  </label>
                  <R2PlaylistPicker
                    disabled={isUploading}
                    scope="videos/"
                    onSelect={({ url, parentName }) => {
                      setR2HlsUrl(url);
                      // Pre-preenche titulo com nome da pasta se admin nao
                      // tiver digitado nada ainda (campo title vive em state
                      // separado; nao mexemos pra nao surpreender se ja
                      // editou).
                      toast({
                        title: 'Pasta selecionada',
                        description: parentName,
                      });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    URL do master playlist (.m3u8) *
                  </label>
                  <Input
                    value={r2HlsUrl}
                    onChange={(e) => setR2HlsUrl(e.target.value)}
                    placeholder="https://cdn.example.com/videos/.../playlist.m3u8"
                    disabled={isUploading}
                  />
                  <p className="text-xs text-muted-foreground">
                    A URL deve terminar em <code>.m3u8</code>. Use a busca
                    acima para auto-preencher.
                  </p>
                </div>

                {/* Duração: campo compacto em linha própria */}
                <div className="space-y-2 max-w-[220px]">
                  <label className="text-sm font-medium">
                    Duração (segundos) *
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={r2Duration}
                      onChange={(e) => {
                        setR2DurationManual(true);
                        setR2Duration(e.target.value);
                        setR2DurationStatus('idle');
                      }}
                      placeholder={
                        r2DurationStatus === 'loading'
                          ? 'Detectando...'
                          : '900'
                      }
                      disabled={isUploading || r2DurationStatus === 'loading'}
                      readOnly={r2DurationStatus === 'loading'}
                      className={
                        r2DurationStatus === 'ok' && !r2DurationManual
                          ? 'pr-9'
                          : undefined
                      }
                    />
                    {r2DurationStatus === 'loading' && (
                      <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {r2DurationStatus === 'ok' && !r2DurationManual && (
                      <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
                    )}
                  </div>
                  {r2DurationStatus === 'loading' && (
                    <p className="text-xs text-muted-foreground">
                      Lendo metadata do master playlist...
                    </p>
                  )}
                  {r2DurationStatus === 'ok' && !r2DurationManual && (
                    <p className="text-xs text-green-700">
                      Detectado automaticamente. Edite se precisar.
                    </p>
                  )}
                  {r2DurationStatus === 'error' && (
                    <p className="text-xs text-amber-700">
                      Não foi possível ler do manifest (CORS ou rede).
                      Informe manualmente.
                    </p>
                  )}
                </div>

                {/* Thumbnail: bloco maior em linha própria */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Thumbnail (opcional)</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1"
                      disabled={
                        !videoTitle.trim() ||
                        isUploading ||
                        r2AiBusy !== 'idle'
                      }
                      onClick={async () => {
                        if (!videoTitle.trim()) return;
                        try {
                          setR2AiBusy('thumbnail');
                          toast({ title: 'IA', description: 'Gerando thumbnail...' });
                          const url = await aiTextService.generateThumbnail(
                            videoTitle.trim(),
                            { overlayText: videoTitle.trim(), style: 'surgical' },
                          );
                          setR2ThumbnailUrl(url);
                          setR2ThumbnailManual(true);
                          toast({ title: 'Pronto', description: 'Thumbnail gerada e enviada ao R2' });
                        } catch (err) {
                          logger.error('[IA thumbnail]', err);
                          toast({
                            title: 'Erro',
                            description: 'Não foi possível gerar a thumbnail',
                            variant: 'destructive',
                          });
                        } finally {
                          setR2AiBusy('idle');
                        }
                      }}
                    >
                      {r2AiBusy === 'thumbnail' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Gerar com IA
                    </Button>
                  </div>
                  {r2ThumbnailStatus === 'loading' && (
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Extraindo thumbnail do vídeo...
                    </p>
                  )}
                  {r2ThumbnailStatus === 'ok' && !r2ThumbnailManual && (
                    <p className="text-xs text-green-700 inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Thumbnail extraída do vídeo. Edite se preferir.
                    </p>
                  )}
                  {r2ThumbnailStatus === 'error' && (
                    <p className="text-xs text-amber-700">
                      Não foi possível extrair do vídeo. Gere com IA ou faça
                      upload manual.
                    </p>
                  )}
                  <ThumbnailUpload
                    value={r2ThumbnailUrl}
                    onChange={(url) => {
                      setR2ThumbnailUrl(url);
                      setR2ThumbnailManual(true);
                    }}
                    aspectRatio="horizontal"
                    label="Thumbnail"
                  />
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input
                    id="r2-captions-embedded"
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-atlas-line-strong"
                    checked={r2CaptionsEmbedded}
                    onChange={(e) => setR2CaptionsEmbedded(e.target.checked)}
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="r2-captions-embedded"
                    className="text-sm text-atlas-ink-2 select-none"
                  >
                    Legendas embutidas no master playlist (SUBTITLES group).
                    Desmarque apenas se o pipeline não gerou legendas.
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Título do Vídeo *</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="h-7 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 gap-1"
                      disabled={
                        !videoTitle.trim() ||
                        isUploading ||
                        r2AiBusy !== 'idle'
                      }
                      onClick={async () => {
                        if (!videoTitle.trim()) return;
                        try {
                          setR2AiBusy('title');
                          toast({ title: 'IA', description: 'Melhorando título...' });
                          const improved = await aiTextService.improveText(
                            videoTitle.trim(),
                            'title',
                            module?.title,
                          );
                          setVideoTitle(improved);
                          toast({ title: 'Pronto', description: 'Título melhorado pela IA' });
                        } catch (err) {
                          logger.error('[IA title]', err);
                          toast({
                            title: 'Erro',
                            description: 'Não foi possível melhorar o título',
                            variant: 'destructive',
                          });
                        } finally {
                          setR2AiBusy('idle');
                        }
                      }}
                    >
                      {r2AiBusy === 'title' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Melhorar com IA
                    </Button>
                  </div>
                  <Input
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="Ex: Colectomia em felinos"
                    disabled={isUploading}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Descrição (Opcional)</label>
                    <div className="flex gap-1">
                      {!videoDescription.trim() && videoTitle.trim() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          className="h-7 text-xs text-atlas-primary hover:text-atlas-primary-2 hover:bg-atlas-primary-soft gap-1"
                          disabled={isUploading || r2AiBusy !== 'idle'}
                          onClick={async () => {
                            if (!videoTitle.trim()) return;
                            try {
                              setR2AiBusy('description');
                              toast({ title: 'IA', description: 'Gerando descrição...' });
                              const desc = await aiTextService.generateDescription(
                                videoTitle.trim(),
                                module?.title,
                              );
                              setVideoDescription(desc);
                              toast({ title: 'Pronto', description: 'Descrição gerada pela IA' });
                            } catch (err) {
                              logger.error('[IA description gen]', err);
                              toast({
                                title: 'Erro',
                                description: 'Não foi possível gerar a descrição',
                                variant: 'destructive',
                              });
                            } finally {
                              setR2AiBusy('idle');
                            }
                          }}
                        >
                          {r2AiBusy === 'description' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Wand2 className="h-3 w-3" />
                          )}
                          Gerar com IA
                        </Button>
                      )}
                      {videoDescription.trim() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          className="h-7 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 gap-1"
                          disabled={isUploading || r2AiBusy !== 'idle'}
                          onClick={async () => {
                            if (!videoDescription.trim()) return;
                            try {
                              setR2AiBusy('description');
                              toast({ title: 'IA', description: 'Melhorando descrição...' });
                              const improved = await aiTextService.improveText(
                                videoDescription.trim(),
                                'description',
                                module?.title,
                              );
                              setVideoDescription(improved);
                              toast({ title: 'Pronto', description: 'Descrição melhorada pela IA' });
                            } catch (err) {
                              logger.error('[IA description improve]', err);
                              toast({
                                title: 'Erro',
                                description: 'Não foi possível melhorar a descrição',
                                variant: 'destructive',
                              });
                            } finally {
                              setR2AiBusy('idle');
                            }
                          }}
                        >
                          {r2AiBusy === 'description' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          Melhorar com IA
                        </Button>
                      )}
                    </div>
                  </div>
                  <Textarea
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    placeholder="Descreva o conteúdo do vídeo..."
                    className="min-h-[80px]"
                    disabled={isUploading}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsUploadModalOpen(false)}
                    disabled={isUploading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmitFromR2Hls}
                    disabled={
                      isUploading ||
                      !videoTitle.trim() ||
                      !r2HlsUrl.trim() ||
                      !r2Duration.trim()
                    }
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <FileVideo className="mr-2 h-4 w-4" />
                        Registrar R2 HLS
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* Pós-criação: managers ricos (materiais, legendas, quiz) */}
            {createdR2Video && (
              <div className="space-y-6 py-2 min-w-0">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-900 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Vídeo <strong>{createdR2Video.title}</strong> registrado.
                    Adicione conteúdo complementar abaixo. As alterações são
                    salvas em cada seção.
                  </span>
                </div>

                <div className="border-t pt-4">
                  <VideoMaterialsManager videoId={createdR2Video.id} />
                </div>

                <div className="border-t pt-4">
                  <VideoCaptionsManager
                    videoId={createdR2Video.id}
                    videoStatus={createdR2Video.uploadStatus || 'READY'}
                    cloudflareId={createdR2Video.cloudflareId}
                    hlsUrl={(createdR2Video as any).hlsUrl}
                    externalUrl={createdR2Video.externalUrl}
                  />
                </div>

                <div className="border-t pt-4">
                  <VideoQuizManager videoId={createdR2Video.id} />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    onClick={() => {
                      setIsUploadModalOpen(false);
                      void loadVideos();
                    }}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Concluir
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
