'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, FileText, Link as LinkIcon, FileEdit, ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { materialsService, VideoMaterial, MaterialType } from '@/lib/api/materials.service';

interface VideoMaterialsCarouselProps {
  videoId: string;
}

export function VideoMaterialsCarousel({ videoId }: VideoMaterialsCarouselProps) {
  const [materials, setMaterials] = useState<VideoMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, [videoId]);

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
      return () => {
        container.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, [materials]);

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

  const checkScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 280; // Largura aproximada de um card + gap
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const getIcon = (type: MaterialType) => {
    switch (type) {
      case 'PDF':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'LINK':
        return <LinkIcon className="h-8 w-8 text-blue-500" />;
      case 'ARTICLE':
        return <FileEdit className="h-8 w-8 text-green-500" />;
      default:
        return <FileText className="h-8 w-8 text-gray-500" />;
    }
  };

  const getIconBg = (type: MaterialType) => {
    switch (type) {
      case 'PDF':
        return 'bg-red-50';
      case 'LINK':
        return 'bg-blue-50';
      case 'ARTICLE':
        return 'bg-green-50';
      default:
        return 'bg-gray-50';
    }
  };

  const formatFileSize = (bytes?: number | null): string => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Não mostrar nada se não houver materiais
  if (!loading && materials.length === 0) {
    return null;
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-1">
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-[200px] h-[140px] bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900">Materiais Relacionados</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="h-8 w-8 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="h-8 w-8 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {materials.map((material) => (
          <a
            key={material.id}
            href={material.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-[200px] group"
          >
            <div className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:border-gray-300 h-full flex flex-col">
              {/* Ícone */}
              <div className={`w-14 h-14 ${getIconBg(material.type)} rounded-lg flex items-center justify-center mb-3`}>
                {getIcon(material.type)}
              </div>

              {/* Título */}
              <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
                {material.title}
              </h4>

              {/* Descrição ou Tipo */}
              <p className="text-xs text-gray-500 line-clamp-1 flex-1">
                {material.description || materialsService.getTypeLabel(material.type)}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                <span className="text-xs text-gray-400">
                  {material.fileSize ? formatFileSize(material.fileSize) : materialsService.getTypeLabel(material.type)}
                </span>
                <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// Versão compacta para mobile (lista vertical)
export function VideoMaterialsCompactList({ videoId }: VideoMaterialsCarouselProps) {
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
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'LINK':
        return <LinkIcon className="h-5 w-5 text-blue-500" />;
      case 'ARTICLE':
        return <FileEdit className="h-5 w-5 text-green-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  if (!loading && materials.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Materiais</h3>
      {materials.map((material) => (
        <a
          key={material.id}
          href={material.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
        >
          {getIcon(material.type)}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 truncate">{material.title}</p>
            <p className="text-xs text-gray-500">{materialsService.getTypeLabel(material.type)}</p>
          </div>
          <Download className="h-4 w-4 text-gray-400" />
        </a>
      ))}
    </div>
  );
}
