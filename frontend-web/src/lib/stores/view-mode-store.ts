import { create } from 'zustand';

interface ViewModeState {
  isAdminViewingAsStudent: boolean;
  enterStudentView: () => void;
  exitStudentView: () => void;
}

export const useViewModeStore = create<ViewModeState>()((set) => ({
  isAdminViewingAsStudent: false,
  enterStudentView: () => set({ isAdminViewingAsStudent: true }),
  exitStudentView: () => set({ isAdminViewingAsStudent: false }),
}));
