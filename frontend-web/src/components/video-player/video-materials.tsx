'use client';

import { useState, useEffect } from 'react';
import { FileText, Link as LinkIcon, FileEdit, Download, ExternalLink, Loader2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { materialsService, VideoMaterial, MaterialType } from '@/lib/api/materials.service';
import { cn } from '@/lib/utils';

interface VideoMaterialsProps {
  videoId: string;
  className?: string;
}

export function VideoMaterials({ videoId, className }: VideoMaterialsProps) {
  const [materials, setMaterials] = useState<VideoMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMaterials();
  }, [videoId]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await materialsService.getByVideo(videoId);
      setMaterials(data);
    } catch (err: any) {
      console.error('Erro ao carregar materiais:', err);
      setError('Erro ao carregar materiais');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: MaterialType) => {
    switch (type) {
      case 'PDF':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'LINK':
        return <LinkIcon className="h-5 w-5 text-blue-500" />;
      case 'ARTICLE':
        return <FileEdit className="h-5 w-5 text-green-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBadgeVariant = (type: MaterialType) => {
    switch (type) {
      case 'PDF':
        return 'destructive';
      case 'LINK':
        return 'default';
      case 'ARTICLE':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleOpenMaterial = (material: VideoMaterial) => {
    window.open(material.url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        <p>{error}</p>
        <Button variant="ghost" size="sm" onClick={loadMaterials} className="mt-2">
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Nenhum material disponível para esta aula</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <FolderOpen className="h-4 w-4" />
        Materiais da Aula ({materials.length})
      </h3>
      
      <div className="space-y-2">
        {materials.map((material) => (
          <div
            key={material.id}
            className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors cursor-pointer group"
            onClick={() => handleOpenMaterial(material)}
          >
            {/* Ícone */}
            <div className="flex-shrink-0">
              {getIcon(material.type)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 truncate text-sm">
                  {material.title}
                </span>
                <Badge variant={getBadgeVariant(material.type) as any} className="text-xs">
                  {materialsService.getTypeLabel(material.type)}
                </Badge>
              </div>
              {material.description && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {material.description}
                </p>
              )}
              {material.fileSize && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {materialsService.formatFileSize(material.fileSize)}
                </p>
              )}
            </div>

            {/* Ação */}
            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {material.type === 'PDF' ? (
                <Download className="h-4 w-4 text-gray-400" />
              ) : (
                <ExternalLink className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Versão compacta para mobile
export function VideoMaterialsCompact({ videoId, className }: VideoMaterialsProps) {
  const [materials, setMaterials] = useState<VideoMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMaterials();
  }, [videoId]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const data = await materialsService.getByVideo(videoId);
      setMaterials(data);
    } catch (err) {
      console.error('Erro ao carregar materiais:', err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: MaterialType) => {
    switch (type) {
      case 'PDF':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'LINK':
        return <LinkIcon className="h-4 w-4 text-blue-500" />;
      case 'ARTICLE':
        return <FileEdit className="h-4 w-4 text-green-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-4", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className={cn("text-center py-4 text-gray-500 text-sm", className)}>
        Nenhum material disponível
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {materials.map((material) => (
        <a
          key={material.id}
          href={material.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors"
        >
          {getIcon(material.type)}
          <span className="text-sm text-gray-700 truncate flex-1">
            {material.title}
          </span>
          <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />
        </a>
      ))}
    </div>
  );
}

// Badge para mostrar quantidade de materiais
export function VideoMaterialsBadge({ videoId }: { videoId: string }) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCount();
  }, [videoId]);

  const loadCount = async () => {
    try {
      const data = await materialsService.getByVideo(videoId);
      setCount(data.length);
    } catch (err) {
      console.error('Erro ao carregar contagem de materiais:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || count === 0) return null;

  return (
    <Badge variant="secondary" className="text-xs">
      <FolderOpen className="h-3 w-3 mr-1" />
      {count} {count === 1 ? 'material' : 'materiais'}
    </Badge>
  );
}
