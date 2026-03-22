'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/lib/stores/auth-store';

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
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setPreviewUrl(value || '');
  }, [value]);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Por favor, selecione um arquivo de imagem válido.', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'A imagem deve ter no máximo 5MB.', variant: 'destructive' });
      return;
    }

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      const token = useAuthStore.getState().firebaseToken;
      const response = await fetch('/api/upload/thumbnail', {
        method: 'POST',
        body: formData,
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Falha no upload: ${response.status}`);
      }

      const data = await response.json();
      setPreviewUrl(data.url);
      onChange(data.url);

      toast({ title: 'Sucesso', description: 'Imagem enviada com sucesso!' });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({ title: 'Erro', description: 'Não foi possível fazer upload da imagem.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onChange, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleRemove = () => {
    setPreviewUrl('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const aspectRatioClass = aspectRatio === 'horizontal'
    ? 'aspect-video'
    : 'aspect-[9/16]';

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

      {previewUrl ? (
        <div
          className="relative group"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className={`relative ${aspectRatioClass} w-full max-w-md overflow-hidden rounded-lg border bg-muted ${isDragOver ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}>
            <img
              src={previewUrl}
              alt={label || 'Thumbnail preview'}
              className="h-full w-full object-cover"
            />
            <div className={`absolute inset-0 transition-opacity flex items-center justify-center gap-2 ${isDragOver ? 'bg-blue-500/40 opacity-100' : 'bg-black/60 opacity-0 group-hover:opacity-100'}`}>
              {isDragOver ? (
                <p className="text-white font-semibold text-sm">Solte para trocar</p>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {aspectRatio === 'horizontal' ? 'Formato 16:9 (horizontal)' : 'Formato 9:16 (vertical)'}
          </p>
        </div>
      ) : (
        <div
          className={`relative ${aspectRatioClass} w-full max-w-md`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`w-full h-full border-2 border-dashed rounded-lg transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isDragOver
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50 bg-muted/50 hover:bg-muted'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Enviando...</p>
              </>
            ) : isDragOver ? (
              <>
                <Upload className="h-8 w-8 text-blue-500" />
                <p className="text-sm font-medium text-blue-600">Solte a imagem aqui</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <div className="text-center px-4">
                  <p className="text-sm font-medium">
                    Arraste uma imagem ou clique para upload
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
