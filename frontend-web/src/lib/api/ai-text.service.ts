import { apiClient } from './client';

export const aiTextService = {
  async improveText(text: string, type: 'title' | 'description', context?: string): Promise<string> {
    const response = await apiClient.post<{ original: string; improved: string }>('/ai/improve-text', {
      text,
      type,
      context,
    });
    return response.data.improved;
  },

  async generateDescription(title: string, context?: string): Promise<string> {
    const response = await apiClient.post<{ title: string; description: string }>('/ai/generate-description', {
      title,
      context,
    });
    return response.data.description;
  },

  async generateThumbnail(
    title: string,
    options?: { overlayText?: string; style?: 'medical' | 'surgical' | 'anatomy' | 'clinical' }
  ): Promise<string> {
    const response = await apiClient.post<{ url: string; title: string }>('/ai/generate-thumbnail', {
      title,
      overlayText: options?.overlayText,
      style: options?.style || 'medical',
    });
    return response.data.url;
  },
};
