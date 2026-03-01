import { apiClient } from './client';

export const SUPPORTED_CAPTION_LANGUAGES = [
  { code: 'pt', label: 'Portugues' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Espanol' },
  { code: 'fr', label: 'Francais' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'pl', label: 'Polski' },
  { code: 'ru', label: 'Русский' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'cs', label: 'Cestina' },
] as const;

export type SupportedCaptionLanguage = typeof SUPPORTED_CAPTION_LANGUAGES[number]['code'];

export interface Caption {
  language: string;
  label: string;
  generated: boolean;
  status: 'inprogress' | 'ready' | 'error';
}

class CaptionsService {
  async generateCaption(videoId: string, language: SupportedCaptionLanguage = 'pt'): Promise<Caption> {
    const response = await apiClient.post<Caption>(`/videos/${videoId}/captions/generate`, { language });
    return response.data;
  }

  async listCaptions(videoId: string): Promise<Caption[]> {
    const response = await apiClient.get<Caption[]>(`/videos/${videoId}/captions`);
    return response.data;
  }

  async getCaptionStatus(videoId: string, language: string): Promise<Caption | null> {
    try {
      const response = await apiClient.get<Caption>(`/videos/${videoId}/captions/${language}/status`);
      return response.data;
    } catch {
      return null;
    }
  }

  getCaptionVttUrl(videoId: string, language: string): string {
    return `/api/v1/videos/${videoId}/captions/${language}/vtt`;
  }

  async deleteCaption(videoId: string, language: string): Promise<void> {
    await apiClient.delete(`/videos/${videoId}/captions/${language}`);
  }

  getLanguageLabel(code: string): string {
    const lang = SUPPORTED_CAPTION_LANGUAGES.find((l) => l.code === code);
    return lang?.label || code;
  }

  isLanguageSupported(code: string): boolean {
    return SUPPORTED_CAPTION_LANGUAGES.some((l) => l.code === code);
  }
}

export const captionsService = new CaptionsService();
