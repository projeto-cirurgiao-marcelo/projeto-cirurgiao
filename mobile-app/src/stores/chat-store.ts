import { create } from 'zustand';

export type ChatType = 'general' | 'video' | 'library';

interface VideoContext {
  videoId: string;
  courseId: string;
  videoTitle: string;
}

interface ChatStoreState {
  fabExpanded: boolean;
  videoContext: VideoContext | null;
  modalChatType: ChatType | null;
}

interface ChatStoreActions {
  toggleFab: () => void;
  closeFab: () => void;
  setVideoContext: (ctx: VideoContext | null) => void;
  openChat: (type: ChatType) => void;
  closeChat: () => void;
}

const useChatStore = create<ChatStoreState & ChatStoreActions>((set) => ({
  fabExpanded: false,
  videoContext: null,
  modalChatType: null,

  toggleFab: () => set((s) => ({ fabExpanded: !s.fabExpanded })),
  closeFab: () => set({ fabExpanded: false }),

  setVideoContext: (ctx) => set({ videoContext: ctx }),

  openChat: (type) => set({ modalChatType: type, fabExpanded: false }),
  closeChat: () => set({ modalChatType: null }),
}));

export default useChatStore;
