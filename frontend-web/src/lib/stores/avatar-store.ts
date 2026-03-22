import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AvatarState {
  photoUrl: string | null;
  setPhotoUrl: (url: string | null) => void;
}

/**
 * Store global para a foto de perfil do usuário.
 * Persistido em localStorage para evitar flash de iniciais.
 */
export const useAvatarStore = create<AvatarState>()(
  persist(
    (set) => ({
      photoUrl: null,
      setPhotoUrl: (url) => set({ photoUrl: url }),
    }),
    {
      name: 'user-avatar',
    }
  )
);
