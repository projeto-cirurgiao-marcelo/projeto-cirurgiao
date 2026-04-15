export interface ChatConversation {
  id: string;
  userId: string;
  videoId: string | null;
  courseId: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources: ChatSource[] | null;
  feedback: 'helpful' | 'not_helpful' | null;
  createdAt: string;
}

export interface ChatSource {
  videoId: string;
  videoTitle?: string;
  timestamp: number;
  text: string;
}

export interface SendMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  suggestions: string[];
}

export interface ListConversationsResponse {
  conversations: ChatConversation[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateConversationDto {
  videoId?: string;
  courseId?: string;
  title?: string;
}

export interface SendMessageDto {
  message: string;
  videoId?: string;
  courseId?: string;
}

export type MessageFeedback = 'helpful' | 'not_helpful';

export type ChatType = 'general' | 'video' | 'library';
