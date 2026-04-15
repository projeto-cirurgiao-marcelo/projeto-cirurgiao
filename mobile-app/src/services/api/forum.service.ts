/**
 * Servico de API do Forum - CRUD de topicos, respostas e votos
 * Alinhado com backend NestJS endpoints
 */

import { apiClient } from './client';
import {
  ForumTopic,
  CreateTopicDto,
  UpdateTopicDto,
  CreateReplyDto,
  CreateReportDto,
  ForumReply,
  ForumReport,
  VoteTopicDto,
  VoteReplyDto,
  TopicsResponse,
  VoteResponse,
  GetTopicsParams,
} from '../../types';

export const forumService = {
  // ---- Topicos ----

  /** Lista topicos com filtros e paginacao */
  async getTopics(params?: GetTopicsParams): Promise<TopicsResponse> {
    const response = await apiClient.get('/forum/topics', { params });
    return response.data;
  },

  /** Busca topico por ID com respostas */
  async getTopicById(id: string): Promise<ForumTopic> {
    const response = await apiClient.get(`/forum/topics/${id}`);
    return response.data;
  },

  /** Cria novo topico */
  async createTopic(data: CreateTopicDto): Promise<ForumTopic> {
    const response = await apiClient.post('/forum/topics', data);
    return response.data;
  },

  /** Atualiza topico (admin) */
  async updateTopic(id: string, data: UpdateTopicDto): Promise<ForumTopic> {
    const response = await apiClient.patch(`/forum/topics/${id}`, data);
    return response.data;
  },

  /** Deleta topico (admin) */
  async deleteTopic(id: string): Promise<void> {
    await apiClient.delete(`/forum/topics/${id}`);
  },

  // ---- Respostas ----

  /** Cria resposta em um topico */
  async createReply(data: CreateReplyDto): Promise<ForumReply> {
    const response = await apiClient.post('/forum/replies', data);
    return response.data;
  },

  /** Atualiza resposta */
  async updateReply(id: string, content: string): Promise<ForumReply> {
    const response = await apiClient.patch(`/forum/replies/${id}`, { content });
    return response.data;
  },

  /** Deleta resposta */
  async deleteReply(id: string): Promise<void> {
    await apiClient.delete(`/forum/replies/${id}`);
  },

  // ---- Votos ----

  /** Vota em um topico (1 = upvote, -1 = downvote) */
  async voteOnTopic(data: VoteTopicDto): Promise<VoteResponse> {
    const response = await apiClient.post('/forum/votes/topics', data);
    return response.data;
  },

  /** Vota em uma resposta (1 = upvote, -1 = downvote) */
  async voteOnReply(data: VoteReplyDto): Promise<VoteResponse> {
    const response = await apiClient.post('/forum/votes/replies', data);
    return response.data;
  },

  // ---- Denuncias ----

  /** Denuncia um topico */
  async reportTopic(data: CreateReportDto): Promise<ForumReport> {
    const response = await apiClient.post('/forum/reports', data);
    return response.data;
  },
};

export default forumService;
