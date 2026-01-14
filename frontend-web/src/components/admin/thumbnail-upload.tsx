'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ThumbnailUploadProps {
  value?: string;
  onChange: (url: string) => void;
  aspectRatio?: 'horizontal' | 'vertical';
  label?: string;
}

export function ThumbnailUpload({ 
  value, 
  onChange, 
  aspectRatio = 'horizontal',
  label 
}: ThumbnailUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(value || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Sincronizar previewUrl quando value mudar (ex: ao editar vídeo)
  useEffect(() => {
    setPreviewUrl(value || '');
  }, [value]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um arquivo de imagem válido.',
        variant: 'destructive',
      });
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 5MB.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);

      // Criar FormData
      const formData = new FormData();
      formData.append('file', file);

      // Upload para o backend
      const response = await fetch('/api/upload/thumbnail', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Falha no upload: ${response.status}`);
      }

      const data = await response.json();
      const imageUrl = data.url;

      setPreviewUrl(imageUrl);
      onChange(imageUrl);

      toast({
        title: 'Sucesso',
        description: 'Imagem enviada com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer upload da imagem.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreviewUrl('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const aspectRatioClass = aspectRatio === 'horizontal' 
    ? 'aspect-video' // 16:9
    : 'aspect-[9/16]'; // 9:16

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />

      {/* Preview ou área de upload */}
      {previewUrl ? (
        <div className="relative group">
          <div className={`relative ${aspectRatioClass} w-full max-w-md overflow-hidden rounded-lg border bg-muted`}>
            <img
              src={previewUrl}
              alt={label || 'Thumbnail preview'}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Trocar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                disabled={isUploading}
              >
                <X className="h-4 w-4 mr-2" />
                Remover
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {aspectRatio === 'horizontal' ? 'Formato 16:9 (horizontal)' : 'Formato 9:16 (vertical)'}
          </p>
        </div>
      ) : (
        <div className={`relative ${aspectRatioClass} w-full max-w-md`}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full h-full border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-muted-foreground/50 transition-colors bg-muted/50 hover:bg-muted flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Enviando...</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <div className="text-center px-4">
                  <p className="text-sm font-medium">
                    Clique para fazer upload
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG ou WEBP (máx. 5MB)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {aspectRatio === 'horizontal' ? 'Recomendado: 1920x1080px' : 'Recomendado: 1080x1920px'}
                  </p>
                </div>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
