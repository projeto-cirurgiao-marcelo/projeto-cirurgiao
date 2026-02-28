import { apiClient } from './client';
import type {
  ForumTopic,
  ForumReply,
  ForumReport,
  CreateTopicDto,
  UpdateTopicDto,
  CreateReplyDto,
  CreateReportDto,
  VoteTopicDto,
  VoteReplyDto,
  TopicsResponse,
  VoteResponse,
} from '../types/forum.types';

export const forumService = {
  // ==================== TÓPICOS ====================

  /**
   * Criar novo tópico
   */
  async createTopic(data: CreateTopicDto): Promise<ForumTopic> {
    const response = await apiClient.post<ForumTopic>('/forum/topics', data);
    return response.data;
  },

  /**
   * Listar tópicos com filtros e paginação
   */
  async getTopics(params?: {
    categoryId?: string;
    videoId?: string;
    page?: number;
    limit?: number;
  }): Promise<TopicsResponse> {
    const response = await apiClient.get<TopicsResponse>('/forum/topics', { params });
    return response.data;
  },

  /**
   * Buscar tópico por ID (com respostas)
   */
  async getTopicById(id: string): Promise<ForumTopic> {
    const response = await apiClient.get<ForumTopic>(`/forum/topics/${id}`);
    return response.data;
  },

  /**
   * Atualizar tópico
   */
  async updateTopic(id: string, data: UpdateTopicDto): Promise<ForumTopic> {
    const response = await apiClient.patch<ForumTopic>(`/forum/topics/${id}`, data);
    return response.data;
  },

  /**
   * Deletar tópico
   */
  async deleteTopic(id: string): Promise<void> {
    await apiClient.delete(`/forum/topics/${id}`);
  },

  // ==================== RESPOSTAS ====================

  /**
   * Criar resposta
   */
  async createReply(data: CreateReplyDto): Promise<ForumReply> {
    const response = await apiClient.post<ForumReply>('/forum/replies', data);
    return response.data;
  },

  /**
   * Atualizar resposta
   */
  async updateReply(id: string, content: string): Promise<ForumReply> {
    const response = await apiClient.patch<ForumReply>(`/forum/replies/${id}`, { content });
    return response.data;
  },

  /**
   * Deletar resposta
   */
  async deleteReply(id: string): Promise<void> {
    await apiClient.delete(`/forum/replies/${id}`);
  },

  // ==================== VOTOS ====================

  /**
   * Votar em tópico (upvote/downvote/toggle)
   */
  async voteOnTopic(data: VoteTopicDto): Promise<VoteResponse> {
    const response = await apiClient.post<VoteResponse>('/forum/votes/topics', data);
    return response.data;
  },

  /**
   * Votar em resposta (upvote/downvote/toggle)
   */
  async voteOnReply(data: VoteReplyDto): Promise<VoteResponse> {
    const response = await apiClient.post<VoteResponse>('/forum/votes/replies', data);
    return response.data;
  },

  // ==================== DENÚNCIAS ====================

  /**
   * Denunciar um tópico
   */
  async reportTopic(data: CreateReportDto): Promise<ForumReport> {
    const response = await apiClient.post<ForumReport>('/forum/reports', data);
    return response.data;
  },
};
