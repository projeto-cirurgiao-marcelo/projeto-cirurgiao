import { apiClient } from './client';
import { logger } from '../../lib/logger';
import type {
  LibraryConversation,
  LibraryMessage,
  LibrarySendMessageResponse,
  LibraryListConversationsResponse,
  TokenQuota,
} from '../../types/library.types';

export const libraryService = {
  async createConversation(title?: string): Promise<LibraryConversation> {
    const { data } = await apiClient.post('/library/chat/conversations', { title });
    return data;
  },

  async listConversations(limit = 20, offset = 0): Promise<LibraryListConversationsResponse> {
    try {
      const { data } = await apiClient.get('/library/chat/conversations', {
        params: { limit, offset },
      });
      return data;
    } catch (error) {
      logger.error('[libraryService] Erro ao listar conversas:', error);
      return { conversations: [], total: 0 };
    }
  },

  async getConversation(id: string): Promise<LibraryConversation> {
    const { data } = await apiClient.get(`/library/chat/conversations/${id}`);
    return data;
  },

  async deleteConversation(id: string): Promise<void> {
    await apiClient.delete(`/library/chat/conversations/${id}`);
  },

  async sendMessage(conversationId: string, message: string): Promise<LibrarySendMessageResponse> {
    const { data } = await apiClient.post(
      `/library/chat/conversations/${conversationId}/messages`,
      { message },
      { timeout: 120000 },
    );
    return data;
  },

  async addFeedback(messageId: string, feedback: 'helpful' | 'not_helpful'): Promise<void> {
    await apiClient.post(`/library/chat/messages/${messageId}/feedback`, { feedback });
  },

  async getQuota(): Promise<TokenQuota> {
    const { data } = await apiClient.get('/library/quota');
    return data;
  },

  async getSuggestions(): Promise<string[]> {
    try {
      const { data } = await apiClient.get('/library/suggestions');
      return data;
    } catch (error) {
      logger.error('[libraryService] Erro ao obter sugestoes:', error);
      return [];
    }
  },
};

export default libraryService;
