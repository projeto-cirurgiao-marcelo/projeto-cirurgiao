import { create } from 'zustand';

interface ViewModeState {
  isStudentView: boolean;
  toggleViewMode: () => void;
  setStudentView: (active: boolean) => void;
}

export const useViewModeStore = create<ViewModeState>()((set) => ({
  isStudentView: false,
  toggleViewMode: () => set((state) => ({ isStudentView: !state.isStudentView })),
  setStudentView: (active) => set({ isStudentView: active }),
}));
