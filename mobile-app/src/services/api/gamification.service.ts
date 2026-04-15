import { apiClient } from './client';
import type {
  GamificationProfile,
  BadgesResponse,
  GamificationEventsResponse,
  EventHistoryResponse,
  LeaderboardResponse,
  LeaderboardPeriod,
  ChallengesResponse,
  ClaimChallengeResponse,
} from '../../types/gamification.types';

export const gamificationService = {
  async getProfile(): Promise<GamificationProfile> {
    const response = await apiClient.get<GamificationProfile>('/gamification/profile');
    return response.data;
  },

  async getBadges(): Promise<BadgesResponse> {
    const response = await apiClient.get<BadgesResponse>('/gamification/badges');
    return response.data;
  },

  async getRecentEvents(): Promise<GamificationEventsResponse> {
    const response = await apiClient.get<GamificationEventsResponse>('/gamification/events/recent');
    return response.data;
  },

  async getEventHistory(limit = 30): Promise<EventHistoryResponse> {
    const response = await apiClient.get<EventHistoryResponse>(
      `/gamification/events/history?limit=${limit}`
    );
    return response.data;
  },

  async markEventSeen(eventId: string): Promise<void> {
    await apiClient.patch(`/gamification/events/${eventId}/seen`);
  },

  async markEventRead(eventId: string): Promise<void> {
    await apiClient.patch(`/gamification/events/${eventId}/read`);
  },

  async markAllEventsRead(): Promise<{ count: number }> {
    const response = await apiClient.patch<{ success: boolean; count: number }>(
      '/gamification/events/read-all'
    );
    return response.data;
  },

  async getLeaderboard(
    period: LeaderboardPeriod = 'weekly',
    page = 1,
    limit = 50,
  ): Promise<LeaderboardResponse> {
    const response = await apiClient.get<LeaderboardResponse>(
      `/gamification/leaderboard?period=${period}&page=${page}&limit=${limit}`
    );
    return response.data;
  },

  async getChallenges(): Promise<ChallengesResponse> {
    const response = await apiClient.get<ChallengesResponse>('/gamification/challenges');
    return response.data;
  },

  async claimChallenge(challengeId: string): Promise<ClaimChallengeResponse> {
    const response = await apiClient.post<ClaimChallengeResponse>(
      `/gamification/challenges/${challengeId}/claim`
    );
    return response.data;
  },
};

export default gamificationService;
