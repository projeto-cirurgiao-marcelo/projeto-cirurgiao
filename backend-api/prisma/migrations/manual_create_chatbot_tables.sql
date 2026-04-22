-- Migration: Criar tabelas do Chatbot com IA (RAG)
-- Data: 29/01/2026
-- Descrição: Adiciona tabelas para conversas, mensagens e embeddings de transcrições

-- ============================================
-- TABELA: chat_conversations
-- Armazena as conversas do chatbot por usuário
-- ============================================
CREATE TABLE IF NOT EXISTS "chat_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "videoId" UUID,
    "courseId" UUID,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- Índices para chat_conversations
CREATE INDEX IF NOT EXISTS "chat_conversations_userId_idx" ON "chat_conversations"("userId");
CREATE INDEX IF NOT EXISTS "chat_conversations_videoId_idx" ON "chat_conversations"("videoId");
CREATE INDEX IF NOT EXISTS "chat_conversations_courseId_idx" ON "chat_conversations"("courseId");
CREATE INDEX IF NOT EXISTS "chat_conversations_createdAt_idx" ON "chat_conversations"("createdAt");

-- Foreign key para users
ALTER TABLE "chat_conversations" 
ADD CONSTRAINT "chat_conversations_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- TABELA: chat_messages
-- Armazena as mensagens de cada conversa
-- ============================================
CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversationId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "tokenCount" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- Índices para chat_messages
CREATE INDEX IF NOT EXISTS "chat_messages_conversationId_idx" ON "chat_messages"("conversationId");
CREATE INDEX IF NOT EXISTS "chat_messages_createdAt_idx" ON "chat_messages"("createdAt");

-- Foreign key para chat_conversations
ALTER TABLE "chat_messages" 
ADD CONSTRAINT "chat_messages_conversationId_fkey" 
FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- TABELA: transcript_embeddings
-- Cache de embeddings das transcrições para busca semântica
-- ============================================
CREATE TABLE IF NOT EXISTS "transcript_embeddings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "videoId" UUID NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "chunkText" TEXT NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "embeddingId" TEXT,
    "isIndexed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcript_embeddings_pkey" PRIMARY KEY ("id")
);

-- Índices para transcript_embeddings
CREATE INDEX IF NOT EXISTS "transcript_embeddings_videoId_idx" ON "transcript_embeddings"("videoId");
CREATE INDEX IF NOT EXISTS "transcript_embeddings_isIndexed_idx" ON "transcript_embeddings"("isIndexed");

-- Constraint única para videoId + chunkIndex
ALTER TABLE "transcript_embeddings" 
ADD CONSTRAINT "transcript_embeddings_videoId_chunkIndex_key" 
UNIQUE ("videoId", "chunkIndex");

-- ============================================
-- COMENTÁRIOS NAS TABELAS
-- ============================================
COMMENT ON TABLE "chat_conversations" IS 'Conversas do chatbot com IA por usuário';
COMMENT ON TABLE "chat_messages" IS 'Mensagens das conversas do chatbot';
COMMENT ON TABLE "transcript_embeddings" IS 'Cache de embeddings das transcrições para busca semântica RAG';

COMMENT ON COLUMN "chat_conversations"."videoId" IS 'Contexto do vídeo atual (opcional)';
COMMENT ON COLUMN "chat_conversations"."courseId" IS 'Contexto do curso (opcional)';
COMMENT ON COLUMN "chat_conversations"."title" IS 'Título gerado automaticamente';

COMMENT ON COLUMN "chat_messages"."role" IS 'user ou assistant';
COMMENT ON COLUMN "chat_messages"."sources" IS 'Referências às transcrições [{videoId, videoTitle, timestamp, text}]';
COMMENT ON COLUMN "chat_messages"."tokenCount" IS 'Tokens usados na geração (para respostas do assistant)';
COMMENT ON COLUMN "chat_messages"."feedback" IS 'helpful, not_helpful ou null';

COMMENT ON COLUMN "transcript_embeddings"."chunkIndex" IS 'Índice do chunk dentro do vídeo';
COMMENT ON COLUMN "transcript_embeddings"."embeddingId" IS 'ID do embedding no Vertex AI Vector Search';
COMMENT ON COLUMN "transcript_embeddings"."isIndexed" IS 'Se já foi indexado no Vector Search';