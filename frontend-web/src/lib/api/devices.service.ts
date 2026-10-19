import { apiClient } from './client';

export interface ConnectedDevice {
  id: string;
  name: string | null;
  platform: 'ios' | 'android' | 'web';
  lastSeenAt: string;
  createdAt: string;
  /** true = o navegador/app que fez esta requisição */
  current: boolean;
}

export const devicesService = {
  async list(): Promise<ConnectedDevice[]> {
    const { data } = await apiClient.get<ConnectedDevice[]>('/auth/devices');
    return data;
  },
  async revoke(id: string): Promise<void> {
    await apiClient.delete(`/auth/devices/${id}`);
  },
};
