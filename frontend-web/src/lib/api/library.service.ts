import { apiClient } from './client';

// ============================================
// Tipos
// ============================================

export interface LibraryConversation {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: LibraryMessage[];
}

export interface LibraryMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources: LibrarySource[] | null;
  tokenCount: number | null;
  feedback: string | null;
  createdAt: string;
}

export interface LibrarySource {
  documentTitle: string;
  chapter: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  snippet: string;
}

export interface TokenQuota {
  tokensUsed: number;
  tokensRemaining: number;
  dailyLimit: number;
  date: string;
}

export interface SendMessageResponse {
  userMessage: LibraryMessage;
  assistantMessage: LibraryMessage;
  sources: LibrarySource[];
}

// ============================================
// Serviço
// ============================================

export const libraryService = {
  // Conversas
  async createConversation(title?: string): Promise<LibraryConversation> {
    const { data } = await apiClient.post('/library/chat/conversations', { title });
    return data;
  },

  async listConversations(limit = 20, offset = 0): Promise<{
    conversations: LibraryConversation[];
    total: number;
  }> {
    const { data } = await apiClient.get('/library/chat/conversations', {
      params: { limit, offset },
    });
    return data;
  },

  async getConversation(id: string): Promise<LibraryConversation> {
    const { data } = await apiClient.get(`/library/chat/conversations/${id}`);
    return data;
  },

  async deleteConversation(id: string): Promise<void> {
    await apiClient.delete(`/library/chat/conversations/${id}`);
  },

  // Mensagens
  async sendMessage(conversationId: string, message: string): Promise<SendMessageResponse> {
    const { data } = await apiClient.post(
      `/library/chat/conversations/${conversationId}/messages`,
      { message },
      { timeout: 120000 }, // 2 minutos — IA precisa buscar chunks + gerar resposta
    );
    return data;
  },

  async addFeedback(messageId: string, feedback: 'helpful' | 'not_helpful'): Promise<void> {
    await apiClient.post(`/library/chat/messages/${messageId}/feedback`, { feedback });
  },

  // Cota
  async getQuota(): Promise<TokenQuota> {
    const { data } = await apiClient.get('/library/quota');
    return data;
  },

  // Sugestões
  async getSuggestions(): Promise<string[]> {
    const { data } = await apiClient.get('/library/suggestions');
    return data;
  },
};
