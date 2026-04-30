import { apiClient } from './client';
import type {
  ActivityItem,
  DashboardStats,
  EnrollmentsChartResponse,
  TopCourseItem,
} from '@/types/admin-dashboard.types';

export const adminDashboardService = {
  async getStats(): Promise<DashboardStats> {
    const { data } = await apiClient.get<DashboardStats>('/admin/dashboard/stats');
    return data;
  },

  async getActivity(limit = 10): Promise<ActivityItem[]> {
    const { data } = await apiClient.get<ActivityItem[]>(
      `/admin/dashboard/activity?limit=${limit}`,
    );
    return data;
  },

  async getEnrollmentsChart(
    range: '7d' | '30d' | '6m' | '1y' = '6m',
    granularity: 'day' | 'week' | 'month' = 'month',
  ): Promise<EnrollmentsChartResponse> {
    const { data } = await apiClient.get<EnrollmentsChartResponse>(
      `/admin/dashboard/enrollments-chart?range=${range}&granularity=${granularity}`,
    );
    return data;
  },

  async getTopCourses(limit = 5): Promise<TopCourseItem[]> {
    const { data } = await apiClient.get<TopCourseItem[]>(
      `/admin/dashboard/top-courses?limit=${limit}`,
    );
    return data;
  },
};
