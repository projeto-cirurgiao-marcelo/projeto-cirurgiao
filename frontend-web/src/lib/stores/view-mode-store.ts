import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ViewModeState {
  isAdminViewingAsStudent: boolean;
  enterStudentView: () => void;
  exitStudentView: () => void;
}

export const useViewModeStore = create<ViewModeState>()(
  persist(
    (set) => ({
      isAdminViewingAsStudent: false,
      enterStudentView: () => set({ isAdminViewingAsStudent: true }),
      exitStudentView: () => set({ isAdminViewingAsStudent: false }),
    }),
    {
      name: 'view-mode',
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null;
          const value = sessionStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return;
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return;
          sessionStorage.removeItem(name);
        },
      },
    },
  ),
);
