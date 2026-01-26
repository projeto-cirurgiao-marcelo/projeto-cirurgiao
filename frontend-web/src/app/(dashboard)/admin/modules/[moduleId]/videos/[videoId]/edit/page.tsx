'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { videosService } from '@/lib/api';
import { VideoMaterialsManager } from '@/components/admin/video-materials-manager';
import { VideoTranscriptManager } from '@/components/admin/video-transcript-manager';
import type { Video } from '@/lib/types/course.types';

export default function EditVideoPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const moduleId = params.moduleId as string;
  const videoId = params.videoId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [video, setVideo] = useState<Video | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

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
    } catch (error) {
      console.error('Erro ao carregar vídeo:', error);
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

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: 'Erro',
        description: 'O título é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      await videosService.update(videoId, {
        title: title.trim(),
        description: description.trim() || undefined,
      });
      toast({
        title: 'Sucesso',
        description: 'Vídeo atualizado com sucesso!',
      });
    } catch (error: any) {
      console.error('Erro ao salvar vídeo:', error);
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
      console.error('Erro ao alterar publicação:', error);
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
      console.error('Erro ao deletar vídeo:', error);
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
            <h1 className="text-2xl font-bold">Editar Vídeo</h1>
            <p className="text-muted-foreground text-sm">
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
              Edite o título e descrição do vídeo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do vídeo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do vídeo (opcional)"
                className="min-h-[100px]"
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

        {/* Transcrição do Vídeo */}
        <VideoTranscriptManager videoId={videoId} />

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
