import { apiClient } from './client';
import {
  isEnqueuedJob,
  waitForJob,
  type WaitForJobOptions,
} from './waitForJob';
import type { EnqueuedJobResponse } from '@/types/api-shared';

export interface ChatConversation {
  id: string;
  userId: string;
  videoId: string | null;
  courseId: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources: ChatSource[] | null;
  feedback: 'helpful' | 'not_helpful' | null;
  createdAt: string;
}

export interface ChatSource {
  videoId: string;
  videoTitle?: string;
  timestamp: number;
  text: string;
}

export interface CreateConversationDto {
  videoId?: string;
  courseId?: string;
  title?: string;
}

export interface SendMessageDto {
  message: string;
  videoId?: string;
  courseId?: string;
}

export interface SendMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  suggestions: string[];
}

export interface ListConversationsResponse {
  conversations: ChatConversation[];
  total: number;
  limit: number;
  offset: number;
}

export const chatbotService = {
  async createConversation(dto: CreateConversationDto): Promise<ChatConversation> {
    const response = await apiClient.post<ChatConversation>('/chat/conversations', dto);
    return response.data;
  },

  async listConversations(options?: { limit?: number; offset?: number }): Promise<ListConversationsResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    const response = await apiClient.get<ListConversationsResponse>(`/chat/conversations?${params.toString()}`);
    return response.data;
  },

  async getConversation(conversationId: string): Promise<ChatConversation> {
    const response = await apiClient.get<ChatConversation>(`/chat/conversations/${conversationId}`);
    return response.data;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/chat/conversations/${conversationId}`);
  },

  /**
   * Envia mensagem no chat RAG de video. Suporta tanto o shape legacy
   * (backend retorna `SendMessageResponse` direto) quanto o novo
   * (retorna `EnqueuedJobResponse`, polling, depois GET na conversa
   * pra recuperar o pair user+assistant).
   *
   * Quando o flag async eh ligado pelo backend, o `resultRef`
   * retornado pelo waitForJob eh o id da `assistantMessage`. Buscamos
   * a conversa inteira pra remontar o shape `SendMessageResponse`
   * compativel com callers atuais (componentes do chat widget).
   * Suggestions sao buscadas separadamente via `getSuggestions`.
   */
  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    jobOpts?: WaitForJobOptions,
  ): Promise<SendMessageResponse> {
    const response = await apiClient.post<
      SendMessageResponse | EnqueuedJobResponse
    >(`/chat/conversations/${conversationId}/messages`, dto);

    if (isEnqueuedJob(response.data)) {
      const assistantMessageId = await waitForJob<string>(
        response.data,
        jobOpts,
      );
      // Busca a conversa atualizada pra encontrar as 2 ultimas
      // mensagens (user que acabamos de enviar + assistant recem-gerada).
      const conversation = await this.getConversation(conversationId);
      const messages = conversation.messages ?? [];
      const assistantMessage = messages.find(
        (m) => m.id === assistantMessageId,
      );
      if (!assistantMessage) {
        throw new Error(
          `Assistant message ${assistantMessageId} nao encontrada na conversa ${conversationId}`,
        );
      }
      // A userMessage eh a imediatamente anterior em ordem cronologica.
      const idx = messages.indexOf(assistantMessage);
      const userMessage = idx > 0 ? messages[idx - 1] : assistantMessage;

      const suggestions = await this.getSuggestions({
        videoId: dto.videoId,
        courseId: dto.courseId,
      }).catch(() => []);

      return {
        userMessage,
        assistantMessage,
        suggestions,
      };
    }

    return response.data;
  },

  async addFeedback(messageId: string, feedback: 'helpful' | 'not_helpful'): Promise<void> {
    await apiClient.post(`/chat/messages/${messageId}/feedback`, { feedback });
  },

  async getSuggestions(options?: { videoId?: string; courseId?: string }): Promise<string[]> {
    const params = new URLSearchParams();
    if (options?.videoId) params.append('videoId', options.videoId);
    if (options?.courseId) params.append('courseId', options.courseId);
    const response = await apiClient.get<string[]>(`/chat/suggestions?${params.toString()}`);
    return response.data;
  },

  async indexVideoTranscript(videoId: string): Promise<{ chunks: number }> {
    const response = await apiClient.post<{ chunks: number }>(`/chat/index/video/${videoId}`);
    return response.data;
  },

  async indexAllTranscripts(): Promise<{ processed: number; total: number }> {
    const response = await apiClient.post<{ processed: number; total: number }>('/chat/index/all');
    return response.data;
  },
};
