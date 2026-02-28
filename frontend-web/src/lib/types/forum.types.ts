// Types para o sistema de fórum

export interface ForumCategory {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    topics: number;
  };
}

export interface ForumTopic {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isClosed: boolean;
  isSolved: boolean;
  views: number;
  upvotes: number;
  downvotes: number;
  authorId: string;
  categoryId: string;
  videoId: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  category?: ForumCategory;
  video?: {
    id: string;
    title: string;
  } | null;
  _count?: {
    replies: number;
    votes: number;
  };
  replies?: ForumReply[];
}

export interface ForumReply {
  id: string;
  content: string;
  authorId: string;
  topicId: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    votes: number;
  };
}

export interface ForumTopicVote {
  id: string;
  value: number; // 1 ou -1
  userId: string;
  topicId: string;
  createdAt: string;
}

export interface ForumReplyVote {
  id: string;
  value: number; // 1 ou -1
  userId: string;
  replyId: string;
  createdAt: string;
}

// DTOs para criação/atualização

export interface CreateTopicDto {
  title: string;
  content: string;
  categoryId: string;
  videoId?: string;
}

export interface UpdateTopicDto {
  title?: string;
  content?: string;
  categoryId?: string;
  videoId?: string;
  isPinned?: boolean;
  isClosed?: boolean;
  isSolved?: boolean;
}

export interface CreateReplyDto {
  content: string;
  topicId: string;
}

export interface VoteTopicDto {
  topicId: string;
  value: number; // 1 ou -1
}

export interface VoteReplyDto {
  replyId: string;
  value: number; // 1 ou -1
}

// Response types

export interface TopicsResponse {
  data: ForumTopic[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface VoteResponse {
  message: string;
}

// Report types
export type ReportReason = 'SPAM' | 'INAPPROPRIATE' | 'OFFENSIVE' | 'OFF_TOPIC' | 'OTHER';
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';

export interface CreateReportDto {
  topicId: string;
  reason: ReportReason;
  description?: string;
}

export interface ForumReport {
  id: string;
  topicId: string;
  reporterId: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  topic?: { id: string; title: string };
  reporter?: { id: string; name: string; email: string };
}
