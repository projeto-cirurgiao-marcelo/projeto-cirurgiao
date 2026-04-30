'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Trash2,
  Sparkles,
  Wand2,
  CheckCircle2,
} from 'lucide-react';
import Hls from 'hls.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { videosService, modulesService } from '@/lib/api';
import { ThumbnailUpload } from '@/components/admin/thumbnail-upload';
import { VideoMaterialsManager } from '@/components/admin/video-materials-manager';
import { VideoCaptionsManager } from '@/components/admin/video-captions-manager';
import { VideoQuizManager } from '@/components/admin/video-quiz-manager';
import { aiTextService } from '@/lib/api/ai-text.service';
import type { Video } from '@/lib/types/course.types';

import { logger } from '@/lib/logger';

export default function EditVideoPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const moduleId = params.moduleId as string;
  const videoId = params.videoId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [video, setVideo] = useState<Video | null>(null);
  const [moduleTitle, setModuleTitle] = useState<string | undefined>(undefined);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hlsUrl, setHlsUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [duration, setDuration] = useState('');

  // Auto-detect duration (mesma estratégia do modal de criação)
  const [durationStatus, setDurationStatus] = useState<
    'idle' | 'loading' | 'ok' | 'error'
  >('idle');
  const [durationManual, setDurationManual] = useState(false);
  const probeVideoRef = useRef<HTMLVideoElement | null>(null);
  const probeHlsRef = useRef<Hls | null>(null);

  // IA actions concorrentes
  const [aiBusy, setAiBusy] = useState<
    'idle' | 'title' | 'description' | 'thumbnail'
  >('idle');

  useEffect(() => {
    loadVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const loadVideo = async () => {
    try {
      setLoading(true);
      const data = await videosService.findOne(videoId);
      setVideo(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setHlsUrl(data.hlsUrl || '');
      setThumbnailUrl(data.thumbnailUrl || '');
      setDuration(
        data.duration && data.duration > 0 ? String(data.duration) : '',
      );
      // Vídeo já existe com duração persistida — assume manual pra
      // não sobrescrever ao re-probar a URL ao montar.
      setDurationManual(true);

      try {
        if (data.moduleId) {
          const mod = await modulesService.findOne(data.moduleId);
          setModuleTitle(mod?.title);
        }
      } catch {
        /* contexto IA é opcional */
      }
    } catch (error) {
      logger.error('Erro ao carregar vídeo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o vídeo.',
        variant: 'destructive',
      });
      router.push(`/admin/modules/${moduleId}/videos`);
    } finally {
      setLoading(false);
    }
  };

  // Re-probar duração quando admin trocar a URL e quiser auto-detect.
  // Só dispara depois do load inicial e se durationManual estiver false.
  useEffect(() => {
    if (loading) return;
    if (durationManual) return;

    const url = hlsUrl.trim();
    if (!url) {
      setDurationStatus('idle');
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      setDurationStatus('idle');
      return;
    }
    if (
      (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
      !parsed.pathname.endsWith('.m3u8')
    ) {
      setDurationStatus('idle');
      return;
    }

    let cancelled = false;
    setDurationStatus('loading');

    const cleanup = () => {
      if (probeHlsRef.current) {
        try { probeHlsRef.current.destroy(); } catch { /* noop */ }
        probeHlsRef.current = null;
      }
      if (probeVideoRef.current) {
        try { probeVideoRef.current.removeAttribute('src'); } catch { /* noop */ }
        probeVideoRef.current = null;
      }
    };

    const debounce = window.setTimeout(() => {
      if (cancelled) return;

      const v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      v.crossOrigin = 'anonymous';
      probeVideoRef.current = v;

      const finish = (durationSec: number | null) => {
        if (cancelled) return;
        if (durationSec && Number.isFinite(durationSec) && durationSec > 0) {
          setDuration(String(Math.round(durationSec)));
          setDurationStatus('ok');
        } else {
          setDurationStatus('error');
        }
        cleanup();
      };

      v.addEventListener('loadedmetadata', () => finish(v.duration), { once: true });
      v.addEventListener('error', () => finish(null), { once: true });

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false });
        probeHlsRef.current = hls;
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data?.fatal) finish(null);
        });
        hls.loadSource(url);
        hls.attachMedia(v);
      } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
        v.src = url;
      } else {
        finish(null);
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(debounce);
      cleanup();
    };
  }, [hlsUrl, durationManual, loading]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: 'Erro',
        description: 'O título é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    const durationNum = duration.trim() ? Number(duration) : undefined;
    if (
      duration.trim() &&
      (!Number.isFinite(durationNum as number) || (durationNum as number) < 0)
    ) {
      toast({
        title: 'Duração inválida',
        description: 'Informe um valor inteiro >= 0 ou deixe em branco.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      await videosService.update(videoId, {
        title: title.trim(),
        description: description.trim() || undefined,
        hlsUrl: hlsUrl.trim() || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        duration:
          durationNum !== undefined ? Math.round(durationNum) : undefined,
        videoSource: hlsUrl.trim() ? 'r2_hls' : undefined,
      });
      toast({
        title: 'Sucesso',
        description: 'Vídeo atualizado com sucesso!',
      });
      await loadVideo();
    } catch (error: any) {
      logger.error('Erro ao salvar vídeo:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar o vídeo.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!video) return;

    try {
      await videosService.togglePublish(videoId);
      toast({
        title: 'Sucesso',
        description: video.isPublished ? 'Vídeo despublicado!' : 'Vídeo publicado!',
      });
      await loadVideo();
    } catch (error) {
      logger.error('Erro ao alterar publicação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status de publicação.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja deletar este vídeo? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await videosService.delete(videoId);
      toast({
        title: 'Sucesso',
        description: 'Vídeo deletado com sucesso!',
      });
      router.push(`/admin/modules/${moduleId}/videos`);
    } catch (error) {
      logger.error('Erro ao deletar vídeo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível deletar o vídeo.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!video) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/admin/modules/${moduleId}/videos`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="atlas-caps text-atlas-muted mb-1.5">ADMIN · VÍDEO</div>
            <h1 className="font-serif text-[22px] sm:text-[26px] font-medium tracking-[-0.015em] leading-[1.15] text-atlas-ink">Editar Vídeo</h1>
            <p className="text-[13px] text-atlas-muted mt-1">
              Atualize as informações e materiais do vídeo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={video.isPublished ? 'default' : 'secondary'}>
            {video.isPublished ? 'Publicado' : 'Rascunho'}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Vídeo</CardTitle>
            <CardDescription>
              Edite título, descrição, thumbnail e fonte do vídeo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Título com IA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Título *</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="h-7 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 gap-1"
                  disabled={!title.trim() || saving || aiBusy !== 'idle'}
                  onClick={async () => {
                    if (!title.trim()) return;
                    try {
                      setAiBusy('title');
                      toast({ title: 'IA', description: 'Melhorando título...' });
                      const improved = await aiTextService.improveText(
                        title.trim(),
                        'title',
                        moduleTitle,
                      );
                      setTitle(improved);
                      toast({ title: 'Pronto', description: 'Título melhorado pela IA' });
                    } catch (err) {
                      logger.error('[IA title]', err);
                      toast({
                        title: 'Erro',
                        description: 'Não foi possível melhorar o título',
                        variant: 'destructive',
                      });
                    } finally {
                      setAiBusy('idle');
                    }
                  }}
                >
                  {aiBusy === 'title' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Melhorar com IA
                </Button>
              </div>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do vídeo"
              />
            </div>

            {/* Descrição com IA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Descrição</Label>
                <div className="flex gap-1">
                  {!description.trim() && title.trim() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="h-7 text-xs text-atlas-primary hover:text-atlas-primary-2 hover:bg-atlas-primary-soft gap-1"
                      disabled={saving || aiBusy !== 'idle'}
                      onClick={async () => {
                        if (!title.trim()) return;
                        try {
                          setAiBusy('description');
                          toast({ title: 'IA', description: 'Gerando descrição...' });
                          const desc = await aiTextService.generateDescription(
                            title.trim(),
                            moduleTitle,
                          );
                          setDescription(desc);
                          toast({ title: 'Pronto', description: 'Descrição gerada pela IA' });
                        } catch (err) {
                          logger.error('[IA description gen]', err);
                          toast({
                            title: 'Erro',
                            description: 'Não foi possível gerar a descrição',
                            variant: 'destructive',
                          });
                        } finally {
                          setAiBusy('idle');
                        }
                      }}
                    >
                      {aiBusy === 'description' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="h-3 w-3" />
                      )}
                      Gerar com IA
                    </Button>
                  )}
                  {description.trim() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="h-7 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 gap-1"
                      disabled={saving || aiBusy !== 'idle'}
                      onClick={async () => {
                        if (!description.trim()) return;
                        try {
                          setAiBusy('description');
                          toast({ title: 'IA', description: 'Melhorando descrição...' });
                          const improved = await aiTextService.improveText(
                            description.trim(),
                            'description',
                            moduleTitle,
                          );
                          setDescription(improved);
                          toast({ title: 'Pronto', description: 'Descrição melhorada pela IA' });
                        } catch (err) {
                          logger.error('[IA description improve]', err);
                          toast({
                            title: 'Erro',
                            description: 'Não foi possível melhorar a descrição',
                            variant: 'destructive',
                          });
                        } finally {
                          setAiBusy('idle');
                        }
                      }}
                    >
                      {aiBusy === 'description' ? (
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
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do vídeo (opcional)"
                className="min-h-[100px]"
              />
            </div>

            {/* URL do Vídeo */}
            <div className="space-y-2">
              <Label htmlFor="hlsUrl">URL do Vídeo</Label>
              <Input
                id="hlsUrl"
                value={hlsUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setHlsUrl(e.target.value);
                  // Permitir re-probar quando admin troca URL
                  setDurationManual(false);
                }}
                placeholder="https://cdn.projetocirurgiao.app/videos/nome-do-video/playlist.m3u8"
              />
            </div>

            {/* Duração: campo compacto */}
            <div className="space-y-2 max-w-[220px]">
              <Label htmlFor="duration">Duração (segundos)</Label>
              <div className="relative">
                <Input
                  id="duration"
                  type="number"
                  min={0}
                  step={1}
                  value={duration}
                  onChange={(e) => {
                    setDurationManual(true);
                    setDuration(e.target.value);
                    setDurationStatus('idle');
                  }}
                  placeholder={
                    durationStatus === 'loading' ? 'Detectando...' : '900'
                  }
                  disabled={durationStatus === 'loading'}
                  readOnly={durationStatus === 'loading'}
                  className={
                    durationStatus === 'ok' && !durationManual ? 'pr-9' : undefined
                  }
                />
                {durationStatus === 'loading' && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {durationStatus === 'ok' && !durationManual && (
                  <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
                )}
              </div>
              {durationStatus === 'loading' && (
                <p className="text-xs text-muted-foreground">
                  Lendo metadata do master playlist...
                </p>
              )}
              {durationStatus === 'ok' && !durationManual && (
                <p className="text-xs text-green-700">
                  Detectado automaticamente. Edite se precisar.
                </p>
              )}
              {durationStatus === 'error' && (
                <p className="text-xs text-amber-700">
                  Não foi possível ler do manifest (CORS ou rede). Informe manualmente.
                </p>
              )}
            </div>

            {/* Thumbnail com IA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Thumbnail (opcional)</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1"
                  disabled={!title.trim() || saving || aiBusy !== 'idle'}
                  onClick={async () => {
                    if (!title.trim()) return;
                    try {
                      setAiBusy('thumbnail');
                      toast({ title: 'IA', description: 'Gerando thumbnail...' });
                      const url = await aiTextService.generateThumbnail(
                        title.trim(),
                        { overlayText: title.trim(), style: 'surgical' },
                      );
                      setThumbnailUrl(url);
                      toast({ title: 'Pronto', description: 'Thumbnail gerada e enviada ao R2' });
                    } catch (err) {
                      logger.error('[IA thumbnail]', err);
                      toast({
                        title: 'Erro',
                        description: 'Não foi possível gerar a thumbnail',
                        variant: 'destructive',
                      });
                    } finally {
                      setAiBusy('idle');
                    }
                  }}
                >
                  {aiBusy === 'thumbnail' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Gerar com IA
                </Button>
              </div>
              <ThumbnailUpload
                value={thumbnailUrl}
                onChange={(url) => setThumbnailUrl(url)}
                aspectRatio="horizontal"
                label="Thumbnail"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Materiais da Aula */}
        <VideoMaterialsManager videoId={videoId} />

        {/* Legendas / Captions */}
        <VideoCaptionsManager
          videoId={videoId}
          videoStatus={video.uploadStatus || 'READY'}
          cloudflareId={video.cloudflareId}
          hlsUrl={(video as any).hlsUrl}
          externalUrl={video.externalUrl}
        />

        {/* Quiz do Vídeo */}
        <VideoQuizManager videoId={videoId} />

        {/* Ações */}
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
            <CardDescription>
              Publicar, despublicar ou deletar o vídeo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={video.isPublished ? 'outline' : 'default'}
                onClick={handleTogglePublish}
              >
                {video.isPublished ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Despublicar
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Publicar
                  </>
                )}
              </Button>

              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Deletar Vídeo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
