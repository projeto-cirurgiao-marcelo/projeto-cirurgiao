import { apiClient } from './client';
import type {
  ChatConversation,
  ChatType,
  CreateConversationDto,
  SendMessageDto,
  SendMessageResponse,
  ListConversationsResponse,
  MessageFeedback,
} from '../../types/chat.types';

export const chatbotService = {
  async createConversation(dto: CreateConversationDto): Promise<ChatConversation> {
    const response = await apiClient.post<ChatConversation>('/chat/conversations', dto);
    return response.data;
  },

  async listConversations(
    limit = 20,
    offset = 0,
    filterType?: 'general' | 'video',
  ): Promise<ListConversationsResponse> {
    try {
      const response = await apiClient.get<ListConversationsResponse>(
        `/chat/conversations?limit=${limit}&offset=${offset}`
      );
      const data = response.data;

      if (filterType === 'general') {
        const filtered = data.conversations.filter((c) => !c.videoId);
        return { ...data, conversations: filtered, total: filtered.length };
      }
      if (filterType === 'video') {
        const filtered = data.conversations.filter((c) => !!c.videoId);
        return { ...data, conversations: filtered, total: filtered.length };
      }

      return data;
    } catch (error) {
      console.error('[chatbotService] Erro ao listar conversas:', error);
      return { conversations: [], total: 0, limit, offset };
    }
  },

  async getConversation(conversationId: string): Promise<ChatConversation> {
    const response = await apiClient.get<ChatConversation>(
      `/chat/conversations/${conversationId}`
    );
    return response.data;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/chat/conversations/${conversationId}`);
  },

  async sendMessage(
    conversationId: string,
    dto: SendMessageDto
  ): Promise<SendMessageResponse> {
    const response = await apiClient.post<SendMessageResponse>(
      `/chat/conversations/${conversationId}/messages`,
      dto
    );
    return response.data;
  },

  async addFeedback(messageId: string, feedback: MessageFeedback): Promise<void> {
    await apiClient.post(`/chat/messages/${messageId}/feedback`, { feedback });
  },

  async getSuggestions(videoId?: string, courseId?: string): Promise<string[]> {
    try {
      const params = new URLSearchParams();
      if (videoId) params.set('videoId', videoId);
      if (courseId) params.set('courseId', courseId);
      const query = params.toString();
      const response = await apiClient.get<string[]>(
        `/chat/suggestions${query ? `?${query}` : ''}`
      );
      return response.data;
    } catch (error) {
      console.error('[chatbotService] Erro ao obter sugestoes:', error);
      return [];
    }
  },
};

export default chatbotService;
