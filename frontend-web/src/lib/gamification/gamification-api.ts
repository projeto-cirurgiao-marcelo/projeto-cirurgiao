import { apiClient } from '@/lib/api/client';
import type {
  GamificationProfileResponse,
  BadgesResponse,
  LeaderboardResponse,
  LeaderboardPeriod,
  ChallengesResponse,
  ClaimChallengeResponse,
  GamificationEventsResponse,
  GamificationEventHistoryResponse,
} from './types';

/**
 * Cliente de API real para gamificacao
 * Comunica com o backend NestJS via Axios
 */
export const gamificationApi = {
  async getProfile(): Promise<GamificationProfileResponse> {
    const { data } = await apiClient.get<GamificationProfileResponse>(
      '/gamification/profile'
    );
    return data;
  },

  async getBadges(): Promise<BadgesResponse> {
    const { data } = await apiClient.get<BadgesResponse>(
      '/gamification/badges'
    );
    return data;
  },

  async getLeaderboard(
    period: LeaderboardPeriod = 'weekly',
    page = 1,
    limit = 50
  ): Promise<LeaderboardResponse> {
    const { data } = await apiClient.get<LeaderboardResponse>(
      '/gamification/leaderboard',
      { params: { period, page, limit } }
    );
    return data;
  },

  async getChallenges(): Promise<ChallengesResponse> {
    const { data } = await apiClient.get<ChallengesResponse>(
      '/gamification/challenges'
    );
    return data;
  },

  async claimChallenge(challengeId: string): Promise<ClaimChallengeResponse> {
    const { data } = await apiClient.post<ClaimChallengeResponse>(
      `/gamification/challenges/${challengeId}/claim`
    );
    return data;
  },

  async getEvents(): Promise<GamificationEventsResponse> {
    const { data } = await apiClient.get<GamificationEventsResponse>(
      '/gamification/events/recent'
    );
    return data;
  },

  async markEventSeen(eventId: string): Promise<void> {
    await apiClient.patch(`/gamification/events/${eventId}/seen`);
  },

  async getEventHistory(limit: number = 30): Promise<GamificationEventHistoryResponse> {
    const { data } = await apiClient.get<GamificationEventHistoryResponse>(
      '/gamification/events/history',
      { params: { limit } },
    );
    return data;
  },

  async markEventRead(eventId: string): Promise<void> {
    await apiClient.patch(`/gamification/events/${eventId}/read`);
  },

  async markAllEventsRead(): Promise<void> {
    await apiClient.patch('/gamification/events/read-all');
  },
};
