/**
 * Serviço de Materiais - Gerencia materiais complementares dos vídeos
 */

import { apiClient } from './client';

export type MaterialType = 'PDF' | 'LINK' | 'ARTICLE';

export interface VideoMaterial {
  id: string;
  videoId: string;
  title: string;
  description?: string;
  type: MaterialType;
  url: string;
  fileSize?: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export const materialsService = {
  /**
   * Listar todos os materiais de um vídeo
   */
  async getByVideoId(videoId: string): Promise<VideoMaterial[]> {
    try {
      const response = await apiClient.get<VideoMaterial[]>(
        `/videos/${videoId}/materials`
      );
      return response.data || [];
    } catch (error) {
      console.error('[materialsService] Erro ao listar materiais:', error);
      return [];
    }
  },

  /**
   * Formatar tamanho do arquivo
   */
  formatFileSize(bytes?: number): string {
    if (!bytes) return '';

    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },

  /**
   * Obter ícone baseado no tipo de material
   */
  getTypeIcon(type: MaterialType): string {
    switch (type) {
      case 'PDF':
        return 'document-text';
      case 'LINK':
        return 'link';
      case 'ARTICLE':
        return 'newspaper';
      default:
        return 'attach';
    }
  },

  /**
   * Obter label do tipo de material
   */
  getTypeLabel(type: MaterialType): string {
    switch (type) {
      case 'PDF':
        return 'PDF';
      case 'LINK':
        return 'Link Externo';
      case 'ARTICLE':
        return 'Artigo';
      default:
        return 'Material';
    }
  },
};

export default materialsService;
