'use client';

import { useState, useEffect } from 'react';
import { FileText, Link as LinkIcon, FileEdit } from 'lucide-react';
import {
  AtlasMaterialRow,
  AtlasMaterialsList,
  type MaterialKind,
} from '@/components/atlas';
import {
  materialsService,
  VideoMaterial,
  MaterialType,
} from '@/lib/api/materials.service';
import { logger } from '@/lib/logger';

interface VideoMaterialsCarouselProps {
  videoId: string;
}

function pickIcon(type: MaterialType) {
  switch (type) {
    case 'PDF':
      return FileText;
    case 'LINK':
      return LinkIcon;
    case 'ARTICLE':
      return FileEdit;
    default:
      return FileText;
  }
}

function pickKind(type: MaterialType): MaterialKind {
  switch (type) {
    case 'PDF':
      return 'pdf';
    case 'LINK':
      return 'link';
    case 'ARTICLE':
      return 'article';
    default:
      return 'file';
  }
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Lista de materiais relacionados ao vídeo. Apresentação delegada a
 * AtlasMaterialsList + AtlasMaterialRow. (Carrossel original substituído
 * por lista vertical conforme DS.)
 */
export function VideoMaterialsCarousel({ videoId }: VideoMaterialsCarouselProps) {
  const [materials, setMaterials] = useState<VideoMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const data = await materialsService.getByVideo(videoId);
      setMaterials(data);
    } catch (err) {
      logger.error('Erro ao carregar materiais:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!loading && materials.length === 0) {
    return null;
  }

  return (
    <AtlasMaterialsList loading={loading} count={materials.length}>
      {materials.map((material) => {
        const tag = material.fileSize
          ? formatFileSize(material.fileSize)
          : materialsService.getTypeLabel(material.type);
        return (
          <AtlasMaterialRow
            key={material.id}
            kind={pickKind(material.type)}
            icon={pickIcon(material.type)}
            title={material.title}
            meta={
              material.description ||
              materialsService.getTypeLabel(material.type)
            }
            tag={tag}
            href={material.url}
            action={material.type === 'PDF' ? 'download' : 'open'}
          />
        );
      })}
    </AtlasMaterialsList>
  );
}

/**
 * Versão compacta para mobile.
 */
export function VideoMaterialsCompactList({
  videoId,
}: VideoMaterialsCarouselProps) {
  const [materials, setMaterials] = useState<VideoMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const data = await materialsService.getByVideo(videoId);
      setMaterials(data);
    } catch (err) {
      logger.error('Erro ao carregar materiais:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!loading && materials.length === 0) {
    return null;
  }

  return (
    <AtlasMaterialsList
      title="Materiais"
      count={materials.length}
      loading={loading}
      compact
    >
      {materials.map((material) => (
        <AtlasMaterialRow
          key={material.id}
          compact
          kind={pickKind(material.type)}
          icon={pickIcon(material.type)}
          title={material.title}
          meta={materialsService.getTypeLabel(material.type)}
          tag={
            material.fileSize ? formatFileSize(material.fileSize) : undefined
          }
          href={material.url}
          action={material.type === 'PDF' ? 'download' : 'open'}
        />
      ))}
    </AtlasMaterialsList>
  );
}
