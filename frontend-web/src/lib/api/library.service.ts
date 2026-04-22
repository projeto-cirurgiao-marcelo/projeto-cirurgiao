import { apiClient } from './client';
import {
  isEnqueuedJob,
  waitForJob,
  type WaitForJobOptions,
} from './waitForJob';
import type { EnqueuedJobResponse } from '@/types/api-shared';

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
  /**
   * Envia mensagem no chat RAG da biblioteca. Suporta tanto o shape
   * legacy (`SendMessageResponse` direto) quanto o novo
   * (`EnqueuedJobResponse` + polling + GET conversa). Ver
   * `chatbotService.sendMessage` pra detalhes do pattern.
   */
  async sendMessage(
    conversationId: string,
    message: string,
    jobOpts?: WaitForJobOptions,
  ): Promise<SendMessageResponse> {
    const { data } = await apiClient.post<
      SendMessageResponse | EnqueuedJobResponse
    >(
      `/library/chat/conversations/${conversationId}/messages`,
      { message },
      { timeout: 120000 }, // 2 minutos — IA precisa buscar chunks + gerar resposta
    );

    if (isEnqueuedJob(data)) {
      const assistantMessageId = await waitForJob<string>(data, jobOpts);
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
      const idx = messages.indexOf(assistantMessage);
      const userMessage = idx > 0 ? messages[idx - 1] : assistantMessage;
      // `sources` do SendMessageResponse legacy vem das `sources` da
      // propria assistantMessage (shape do LibraryMessage).
      return {
        userMessage,
        assistantMessage,
        sources: assistantMessage.sources ?? [],
      };
    }

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
