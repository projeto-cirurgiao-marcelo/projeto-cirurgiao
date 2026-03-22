import { apiClient } from './client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  photoUrl: string | null;
  profession: string | null;
  specializations: string[];
  state: string | null;
  city: string | null;
  bio: string | null;
  onboardingCompleted: boolean;
}

export interface UpdateProfileDto {
  name?: string;
  profession?: string;
  specializations?: string[];
  state?: string;
  city?: string;
  bio?: string;
  photoUrl?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export const profileService = {
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>('/profile');
    return response.data;
  },

  async updateProfile(data: UpdateProfileDto): Promise<UserProfile> {
    const response = await apiClient.put<UserProfile>('/profile', data);
    return response.data;
  },

  async uploadPhoto(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ url: string }>('/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async changePassword(data: ChangePasswordDto): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/profile/change-password', data);
    return response.data;
  },
};
