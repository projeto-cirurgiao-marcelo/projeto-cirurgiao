import { create } from 'zustand';
import { apiClient } from '../services/api/client';

interface OnboardingState {
  specializations: string[];
  profession: string | null;
  state: string | null;
  city: string | null;
  isLoading: boolean;
  error: string | null;
}

interface OnboardingActions {
  toggleSpecialization: (s: string) => void;
  clearSpecializations: () => void;
  setProfession: (p: string) => void;
  setState: (s: string) => void;
  setCity: (c: string) => void;
  submitOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  reset: () => void;
}

const initialState: OnboardingState = {
  specializations: [],
  profession: null,
  state: null,
  city: null,
  isLoading: false,
  error: null,
};

const useOnboardingStore = create<OnboardingState & OnboardingActions>((set, get) => ({
  ...initialState,

  toggleSpecialization: (s: string) => {
    const current = get().specializations;
    if (current.includes(s)) {
      set({ specializations: current.filter((item) => item !== s) });
    } else {
      set({ specializations: [...current, s] });
    }
  },

  clearSpecializations: () => set({ specializations: [] }),

  setProfession: (p: string) => set({ profession: p }),

  setState: (s: string) => set({ state: s }),

  setCity: (c: string) => set({ city: c }),

  submitOnboarding: async () => {
    const { specializations, profession, state, city } = get();
    set({ isLoading: true, error: null });
    try {
      await apiClient.put('/profile/onboarding', {
        specializations,
        profession,
        state,
        city,
      });
      set({ isLoading: false });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao salvar perfil';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  skipOnboarding: async () => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/profile/onboarding/skip');
      set({ isLoading: false });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao pular onboarding';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  reset: () => set(initialState),
}));

export default useOnboardingStore;
