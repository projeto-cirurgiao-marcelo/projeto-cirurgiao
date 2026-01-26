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

export interface CreateMaterialDto {
  title: string;
  description?: string;
  type: MaterialType;
  url: string;
  fileSize?: number;
  order?: number;
}

export interface UpdateMaterialDto {
  title?: string;
  description?: string;
  type?: MaterialType;
  url?: string;
  fileSize?: number;
  order?: number;
}

class MaterialsService {
  /**
   * Listar todos os materiais de um vídeo
   */
  async getByVideo(videoId: string): Promise<VideoMaterial[]> {
    const response = await apiClient.get<VideoMaterial[]>(`/videos/${videoId}/materials`);
    return response.data;
  }

  /**
   * Buscar material por ID
   */
  async getById(videoId: string, materialId: string): Promise<VideoMaterial> {
    const response = await apiClient.get<VideoMaterial>(`/videos/${videoId}/materials/${materialId}`);
    return response.data;
  }

  /**
   * Criar novo material
   */
  async create(videoId: string, data: CreateMaterialDto): Promise<VideoMaterial> {
    const response = await apiClient.post<VideoMaterial>(`/videos/${videoId}/materials`, data);
    return response.data;
  }

  /**
   * Atualizar material
   */
  async update(videoId: string, materialId: string, data: UpdateMaterialDto): Promise<VideoMaterial> {
    const response = await apiClient.patch<VideoMaterial>(`/videos/${videoId}/materials/${materialId}`, data);
    return response.data;
  }

  /**
   * Remover material
   */
  async delete(videoId: string, materialId: string): Promise<void> {
    await apiClient.delete(`/videos/${videoId}/materials/${materialId}`);
  }

  /**
   * Reordenar materiais
   */
  async reorder(videoId: string, materialIds: string[]): Promise<VideoMaterial[]> {
    const response = await apiClient.post<VideoMaterial[]>(`/videos/${videoId}/materials/reorder`, { materialIds });
    return response.data;
  }

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
  }

  /**
   * Obter ícone baseado no tipo de material
   */
  getTypeIcon(type: MaterialType): string {
    switch (type) {
      case 'PDF':
        return '📄';
      case 'LINK':
        return '🔗';
      case 'ARTICLE':
        return '📝';
      default:
        return '📎';
    }
  }

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
  }
}

export const materialsService = new MaterialsService();
