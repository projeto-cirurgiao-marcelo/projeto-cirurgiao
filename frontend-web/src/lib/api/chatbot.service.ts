import { apiClient } from './client';

// ============================================
// Tipos
// ============================================

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

// ============================================
// Serviço de Chatbot
// ============================================

export const chatbotService = {
  /**
   * Criar nova conversa
   */
  async createConversation(dto: CreateConversationDto): Promise<ChatConversation> {
    const response = await apiClient.post<ChatConversation>('/chat/conversations', dto);
    return response.data;
  },

  /**
   * Listar conversas do usuário
   */
  async listConversations(options?: { limit?: number; offset?: number }): Promise<ListConversationsResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    
    const response = await apiClient.get<ListConversationsResponse>(
      `/chat/conversations?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Obter conversa com mensagens
   */
  async getConversation(conversationId: string): Promise<ChatConversation> {
    const response = await apiClient.get<ChatConversation>(`/chat/conversations/${conversationId}`);
    return response.data;
  },

  /**
   * Deletar conversa
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/chat/conversations/${conversationId}`);
  },

  /**
   * Enviar mensagem e obter resposta
   */
  async sendMessage(conversationId: string, dto: SendMessageDto): Promise<SendMessageResponse> {
    const response = await apiClient.post<SendMessageResponse>(
      `/chat/conversations/${conversationId}/messages`,
      dto
    );
    return response.data;
  },

  /**
   * Adicionar feedback a uma mensagem
   */
  async addFeedback(messageId: string, feedback: 'helpful' | 'not_helpful'): Promise<void> {
    await apiClient.post(`/chat/messages/${messageId}/feedback`, { feedback });
  },

  /**
   * Obter sugestões de perguntas
   */
  async getSuggestions(options?: { videoId?: string; courseId?: string }): Promise<string[]> {
    const params = new URLSearchParams();
    if (options?.videoId) params.append('videoId', options.videoId);
    if (options?.courseId) params.append('courseId', options.courseId);
    
    const response = await apiClient.get<string[]>(`/chat/suggestions?${params.toString()}`);
    return response.data;
  },

  /**
   * Indexar transcrição de um vídeo (admin)
   */
  async indexVideoTranscript(videoId: string): Promise<{ chunks: number }> {
    const response = await apiClient.post<{ chunks: number }>(`/chat/index/video/${videoId}`);
    return response.data;
  },

  /**
   * Indexar todas as transcrições (admin)
   */
  async indexAllTranscripts(): Promise<{ processed: number; total: number }> {
    const response = await apiClient.post<{ processed: number; total: number }>('/chat/index/all');
    return response.data;
  },
};

export default chatbotService;