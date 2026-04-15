export interface LibraryConversation {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: LibraryMessage[];
}

export interface LibraryMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources: LibrarySource[] | null;
  tokenCount: number | null;
  feedback: string | null;
  createdAt: string;
}

export interface LibrarySource {
  documentTitle: string;
  chapter: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  snippet: string;
}

export interface TokenQuota {
  tokensUsed: number;
  tokensRemaining: number;
  dailyLimit: number;
  date: string;
}

export interface LibrarySendMessageResponse {
  userMessage: LibraryMessage;
  assistantMessage: LibraryMessage;
  sources: LibrarySource[];
}

export interface LibraryListConversationsResponse {
  conversations: LibraryConversation[];
  total: number;
}
