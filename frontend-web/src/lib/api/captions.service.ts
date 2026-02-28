import { apiClient } from './client';

// Idiomas suportados para geração automática de legendas
export const SUPPORTED_CAPTION_LANGUAGES = [
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'pl', label: 'Polski' },
  { code: 'ru', label: 'Русский' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'cs', label: 'Čeština' },
] as const;

export type SupportedCaptionLanguage = typeof SUPPORTED_CAPTION_LANGUAGES[number]['code'];

export interface Caption {
  language: string;
  label: string;
  generated: boolean;
  status: 'inprogress' | 'ready' | 'error';
}

export interface GenerateCaptionRequest {
  language?: SupportedCaptionLanguage;
}

class CaptionsService {
  /**
   * Gerar legendas automaticamente via IA
   */
  async generateCaption(videoId: string, language: SupportedCaptionLanguage = 'pt'): Promise<Caption> {
    const response = await apiClient.post<Caption>(`/videos/${videoId}/captions/generate`, {
      language,
    });
    return response.data;
  }

  /**
   * Listar todas as legendas de um vídeo
   */
  async listCaptions(videoId: string): Promise<Caption[]> {
    const response = await apiClient.get<Caption[]>(`/videos/${videoId}/captions`);
    return response.data;
  }

  /**
   * Verificar status de uma legenda específica
   */
  async getCaptionStatus(videoId: string, language: string): Promise<Caption | null> {
    try {
      const response = await apiClient.get<Caption>(`/videos/${videoId}/captions/${language}/status`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Obter URL do arquivo VTT
   */
  getCaptionVttUrl(videoId: string, language: string): string {
    return `/api/v1/videos/${videoId}/captions/${language}/vtt`;
  }

  /**
   * Deletar uma legenda
   */
  async deleteCaption(videoId: string, language: string): Promise<void> {
    await apiClient.delete(`/videos/${videoId}/captions/${language}`);
  }

  /**
   * Obter label do idioma pelo código
   */
  getLanguageLabel(code: string): string {
    const lang = SUPPORTED_CAPTION_LANGUAGES.find((l) => l.code === code);
    return lang?.label || code;
  }

  /**
   * Verificar se o idioma é suportado
   */
  isLanguageSupported(code: string): boolean {
    return SUPPORTED_CAPTION_LANGUAGES.some((l) => l.code === code);
  }
}

export const captionsService = new CaptionsService();