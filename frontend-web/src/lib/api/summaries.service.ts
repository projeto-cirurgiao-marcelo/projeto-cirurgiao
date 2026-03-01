import { apiClient } from './client';

export interface VideoSummary {
  id: string;
  videoId: string;
  userId: string;
  content: string;
  version: number;
  tokenCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SummariesListResponse {
  summaries: VideoSummary[];
  count: number;
  maxAllowed: number;
  remainingGenerations: number;
}

export interface RemainingGenerationsResponse {
  used: number;
  remaining: number;
  maxAllowed: number;
}

export interface GenerateSummaryResponse extends VideoSummary {
  remainingGenerations: number;
}

export const summariesService = {
  async generateSummary(videoId: string, additionalInstructions?: string): Promise<GenerateSummaryResponse> {
    const response = await apiClient.post<GenerateSummaryResponse>(
      `/videos/${videoId}/summaries/generate`, { additionalInstructions }
    );
    return response.data;
  },

  async listSummaries(videoId: string): Promise<SummariesListResponse> {
    const response = await apiClient.get<SummariesListResponse>(`/videos/${videoId}/summaries`);
    return response.data;
  },

  async getSummary(videoId: string, summaryId: string): Promise<VideoSummary> {
    const response = await apiClient.get<VideoSummary>(`/videos/${videoId}/summaries/${summaryId}`);
    return response.data;
  },

  async updateSummary(videoId: string, summaryId: string, content: string): Promise<VideoSummary> {
    const response = await apiClient.put<VideoSummary>(`/videos/${videoId}/summaries/${summaryId}`, { content });
    return response.data;
  },

  async deleteSummary(videoId: string, summaryId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/videos/${videoId}/summaries/${summaryId}`);
    return response.data;
  },

  async getRemainingGenerations(videoId: string): Promise<RemainingGenerationsResponse> {
    const response = await apiClient.get<RemainingGenerationsResponse>(`/videos/${videoId}/summaries/remaining`);
    return response.data;
  },

  async downloadSummary(videoId: string, summaryId: string): Promise<void> {
    const response = await apiClient.get(`/videos/${videoId}/summaries/${summaryId}/download`, { responseType: 'blob' });
    const contentDisposition = response.headers['content-disposition'];
    let filename = `resumo-${summaryId}.md`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) filename = match[1];
    }
    const blob = new Blob([response.data], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
