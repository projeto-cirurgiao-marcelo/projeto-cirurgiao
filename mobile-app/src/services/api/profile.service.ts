import { apiClient } from './client';
import { FirebaseError } from 'firebase/app';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../firebase';

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

  async changePassword(data: ChangePasswordDto): Promise<{ message: string }> {
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) {
      throw new FirebaseError('auth/user-token-expired', 'No authenticated user.');
    }
    if (!user.email) {
      throw new FirebaseError('auth/operation-not-allowed', 'An email is required.');
    }

    const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, data.newPassword);
    // The API client reads Firebase's current token on the next request.
    return { message: 'Senha alterada com sucesso!' };
  },
};

export default profileService;
