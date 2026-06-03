'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen,
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ChevronLeft,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import {
  libraryService,
  LibraryConversation,
  LibraryMessage,
  LibrarySource,
  TokenQuota,
} from '@/lib/api/library.service';

export default function LibraryPage() {
  // Estado
  const [conversations, setConversations] = useState<LibraryConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<LibraryConversation | null>(null);
  const [messages, setMessages] = useState<LibraryMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [quota, setQuota] = useState<TokenQuota | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Carregar conversas e cota ao montar
  useEffect(() => {
    loadConversations();
    loadQuota();
    loadSuggestions();
  }, []);

  // Scroll automático para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const data = await libraryService.listConversations();
      setConversations(data.conversations);
    } catch (error) {
      logger.error('Erro ao carregar conversas:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadQuota = async () => {
    try {
      const data = await libraryService.getQuota();
      setQuota(data);
    } catch (error) {
      logger.error('Erro ao carregar cota:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const data = await libraryService.getSuggestions();
      setSuggestions(data);
    } catch (error) {
      logger.error('Erro ao carregar sugestões:', error);
    }
  };

  const selectConversation = async (conversation: LibraryConversation) => {
    try {
      setIsLoading(true);
      const data = await libraryService.getConversation(conversation.id);
      setActiveConversation(data);
      setMessages(data.messages || []);
      setShowSidebar(false);
    } catch (error) {
      logger.error('Erro ao carregar conversa:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const conversation = await libraryService.createConversation();
      setConversations(prev => [conversation, ...prev]);
      setActiveConversation(conversation);
      setMessages([]);
      setShowSidebar(false);
      inputRef.current?.focus();
    } catch (error) {
      logger.error('Erro ao criar conversa:', error);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await libraryService.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversation?.id === id) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (error) {
      logger.error('Erro ao deletar conversa:', error);
    }
  };

  const sendMessage = useCallback(async (messageText?: string) => {
    const text = messageText || inputMessage.trim();
    if (!text || isSending) return;

    // Se não tem conversa ativa, criar uma
    let conversationId = activeConversation?.id;
    if (!conversationId) {
      try {
        const newConversation = await libraryService.createConversation();
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversation(newConversation);
        conversationId = newConversation.id;
      } catch (error) {
        logger.error('Erro ao criar conversa:', error);
        return;
      }
    }

    setInputMessage('');
    setIsSending(true);

    // Adicionar mensagem do usuário otimisticamente
    const tempUserMessage: LibraryMessage = {
      id: `temp-${Date.now()}`,
      conversationId: conversationId!,
      role: 'user',
      content: text,
      sources: null,
      tokenCount: null,
      feedback: null,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const response = await libraryService.sendMessage(conversationId!, text);

      // Substituir mensagem temporária e adicionar resposta
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMessage.id),
        response.userMessage,
        response.assistantMessage,
      ]);

      // Atualizar cota
      loadQuota();

      // Atualizar título na lista de conversas
      loadConversations();
    } catch (error: any) {
      // Remover mensagem temporária em caso de erro
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));

      const errorMessage = error?.response?.data?.message || 'Erro ao enviar mensagem';
      alert(errorMessage);
    } finally {
      setIsSending(false);
    }
  }, [inputMessage, isSending, activeConversation]);

  const handleFeedback = async (messageId: string, feedback: 'helpful' | 'not_helpful') => {
    try {
      await libraryService.addFeedback(messageId, feedback);
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, feedback } : m)),
      );
    } catch (error) {
      logger.error('Erro ao enviar feedback:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quotaPercentage = quota
    ? Math.round((quota.tokensUsed / quota.dailyLimit) * 100)
    : 0;

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-md border border-atlas-line bg-atlas-surface">
      {/* Sidebar de Conversas */}
      <div
        className={cn(
          'flex flex-col border-r border-atlas-line bg-atlas-surface-2',
          'w-full md:w-80 md:flex',
          showSidebar ? 'flex' : 'hidden md:flex',
        )}
      >
        {/* Header da sidebar */}
        <div className="flex items-center justify-between border-b border-atlas-line p-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="size-4 text-atlas-primary shrink-0" strokeWidth={1.5} />
            <h2 className="font-serif text-[15px] font-medium tracking-[-0.005em] text-atlas-ink">Biblioteca IA</h2>
          </div>
          <button
            type="button"
            onClick={createNewConversation}
            className="rounded-sm p-1.5 text-atlas-muted hover:bg-atlas-surface hover:text-atlas-ink transition-colors"
            title="Nova conversa"
            aria-label="Nova conversa"
          >
            <Plus className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Lista de conversas */}
        <div className="flex-1 overflow-y-auto p-2">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-8 text-center text-[12.5px] text-atlas-muted">
              <MessageSquare className="mx-auto mb-2 size-7 text-atlas-muted-2" strokeWidth={1.25} />
              <p>Nenhuma conversa ainda</p>
              <p className="mt-1 text-[11px] text-atlas-muted-2">Clique em + para começar</p>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                onClick={() => selectConversation(conv)}
                onKeyDown={(e) => e.key === 'Enter' && selectConversation(conv)}
                className={cn(
                  'group mb-1 flex w-full cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-left text-[13px] transition-colors duration-150',
                  activeConversation?.id === conv.id
                    ? 'bg-atlas-primary-soft text-atlas-primary-2 font-medium'
                    : 'text-atlas-ink-2 hover:bg-atlas-surface',
                )}
              >
                <span className="truncate">{conv.title || 'Conversa sem título'}</span>
                <button
                  type="button"
                  onClick={(e) => deleteConversation(conv.id, e)}
                  aria-label="Excluir conversa"
                  className="ml-2 sm:hidden sm:group-hover:block shrink-0 rounded-sm p-1 text-atlas-muted hover:bg-atlas-surface hover:text-atlas-accent transition-colors"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.5} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cota de tokens */}
        {quota && (
          <div className="border-t border-atlas-line p-4">
            <div className="mb-1.5 flex items-center justify-between atlas-mono text-[10.5px] text-atlas-muted atlas-num">
              <span className="atlas-caps">Cota diária</span>
              <span>
                {quota.tokensUsed.toLocaleString()} / {quota.dailyLimit.toLocaleString()}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-sm bg-atlas-line">
              <div
                className={cn(
                  'h-full rounded-sm transition-all',
                  quotaPercentage > 90
                    ? 'bg-atlas-accent'
                    : quotaPercentage > 70
                      ? 'bg-atlas-warn'
                      : 'bg-atlas-primary',
                )}
                style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
              />
            </div>
            <p className="mt-1.5 atlas-mono text-[10.5px] text-atlas-muted-2 atlas-num">
              {quota.tokensRemaining.toLocaleString()} tokens restantes
            </p>
          </div>
        )}
      </div>

      {/* Área principal do chat */}
      <div className="flex flex-1 flex-col min-w-0 bg-atlas-bg">
        {/* Header do chat */}
        <div className="flex items-center gap-3 border-b border-atlas-line px-4 py-3 bg-atlas-surface">
          <button
            type="button"
            onClick={() => setShowSidebar(true)}
            aria-label="Abrir lista de conversas"
            className="md:hidden rounded-sm p-1.5 text-atlas-muted hover:bg-atlas-surface-2 hover:text-atlas-ink transition-colors"
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-[15px] font-medium tracking-[-0.005em] text-atlas-ink truncate">
              {activeConversation?.title || 'Nova conversa'}
            </h3>
            <p className="atlas-mono text-[10.5px] text-atlas-muted tracking-[0.04em] uppercase mt-0.5">
              Consulta aos livros · IA
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-sm bg-atlas-primary-soft border border-atlas-primary/30 px-2.5 py-1 atlas-mono text-[10.5px] font-medium text-atlas-primary-2 tracking-[0.04em] uppercase">
            <Sparkles className="size-3" strokeWidth={1.75} />
            IA
          </div>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {messages.length === 0 && !isLoading ? (
            <WelcomeScreen
              suggestions={suggestions}
              onSuggestionClick={(s) => sendMessage(s)}
            />
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map(message => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onFeedback={handleFeedback}
                />
              ))}
              {isSending && (
                <div className="flex gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-atlas-primary-soft border border-atlas-primary/30">
                    <BookOpen className="size-4 text-atlas-primary" strokeWidth={1.5} />
                  </div>
                  <div className="rounded-md rounded-tl-sm bg-atlas-surface border border-atlas-line px-4 py-3">
                    <div className="flex items-center gap-2 text-[13px] text-atlas-muted">
                      <Loader2 className="size-3.5 animate-spin" />
                      Consultando a biblioteca…
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-atlas-line p-4 bg-atlas-surface">
          <div className="mx-auto max-w-3xl">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre medicina veterinária…"
                rows={1}
                className="flex-1 resize-none rounded-md border border-atlas-line bg-atlas-bg px-4 py-3 text-[13px] text-atlas-ink outline-none transition-colors placeholder:text-atlas-muted-2 focus:border-atlas-ink-2"
                disabled={isSending || (quota?.tokensRemaining === 0)}
              />
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isSending || (quota?.tokensRemaining === 0)}
                aria-label="Enviar mensagem"
                className="flex size-11 shrink-0 items-center justify-center rounded-md bg-atlas-primary text-white transition-colors hover:bg-atlas-primary-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" strokeWidth={1.75} />
                )}
              </button>
            </div>
            {quota?.tokensRemaining === 0 && (
              <p className="mt-2 text-[12px] text-atlas-accent">
                Cota diária esgotada. Tente novamente amanhã.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Componentes auxiliares
// ============================================

function WelcomeScreen({
  suggestions,
  onSuggestionClick,
}: {
  suggestions: string[];
  onSuggestionClick: (s: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="mb-5 flex size-12 items-center justify-center rounded-md bg-atlas-primary-soft border border-atlas-primary/30">
        <BookOpen className="size-6 text-atlas-primary" strokeWidth={1.5} />
      </div>
      <h2 className="mb-2 font-serif text-[22px] font-medium tracking-[-0.01em] text-atlas-ink">
        Biblioteca IA
      </h2>
      <p className="mb-7 max-w-md text-center text-[13.5px] leading-[1.55] text-atlas-muted">
        Consulte os livros-texto de Medicina Veterinária usando inteligência
        artificial. Faça perguntas e receba respostas fundamentadas com citações
        das fontes.
      </p>

      {suggestions.length > 0 && (
        <div className="w-full max-w-lg">
          <p className="mb-3 text-center atlas-caps text-atlas-muted-2">
            Sugestões de perguntas
          </p>
          <div className="grid gap-2">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSuggestionClick(suggestion)}
                className="rounded-md border border-atlas-line bg-atlas-surface px-4 py-3 text-left text-[13px] text-atlas-ink-2 transition-colors duration-150 hover:border-atlas-ink-2 hover:bg-atlas-surface-2"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  onFeedback,
}: {
  message: LibraryMessage;
  onFeedback: (id: string, feedback: 'helpful' | 'not_helpful') => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full border',
          isUser
            ? 'bg-atlas-primary text-white border-atlas-primary'
            : 'bg-atlas-primary-soft border-atlas-primary/30',
        )}
      >
        {isUser ? (
          <span className="atlas-mono text-[10.5px] font-semibold tracking-tight">Eu</span>
        ) : (
          <BookOpen className="size-4 text-atlas-primary" strokeWidth={1.5} />
        )}
      </div>

      {/* Conteúdo */}
      <div className={cn('max-w-[85%] space-y-2', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-md px-4 py-3 text-[13.5px] leading-[1.55]',
            isUser
              ? 'rounded-tr-sm bg-atlas-primary text-white'
              : 'rounded-tl-sm bg-atlas-surface border border-atlas-line text-atlas-ink-2',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.content}</p>
          ) : (
            <div
              className="prose prose-sm dark:prose-invert max-w-none break-words [overflow-wrap:anywhere] prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-h4:text-[0.875rem] prose-h5:text-[0.8125rem] prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5"
              dangerouslySetInnerHTML={{
                __html: formatMarkdown(message.content),
              }}
            />
          )}
        </div>

        {/* Fontes */}
        {!isUser && message.sources && (message.sources as LibrarySource[]).length > 0 && (
          <SourcesList sources={message.sources as LibrarySource[]} />
        )}

        {/* Feedback */}
        {!isUser && !message.id.startsWith('temp-') && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onFeedback(message.id, 'helpful')}
              className={cn(
                'rounded-sm p-1.5 text-atlas-muted-2 hover:text-atlas-success transition-colors',
                message.feedback === 'helpful' && 'text-atlas-success',
              )}
              title="Resposta útil"
              aria-label="Marcar resposta como útil"
            >
              <ThumbsUp className="size-3.5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => onFeedback(message.id, 'not_helpful')}
              className={cn(
                'rounded-sm p-1.5 text-atlas-muted-2 hover:text-atlas-accent transition-colors',
                message.feedback === 'not_helpful' && 'text-atlas-accent',
              )}
              title="Resposta não útil"
              aria-label="Marcar resposta como não útil"
            >
              <ThumbsDown className="size-3.5" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SourcesList({ sources }: { sources: LibrarySource[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border border-atlas-line bg-atlas-surface-2 p-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 atlas-mono text-[10.5px] font-medium text-atlas-muted tracking-[0.04em] uppercase atlas-num"
      >
        <Info className="size-3" strokeWidth={1.75} />
        {sources.length} fonte{sources.length > 1 ? 's' : ''} consultada{sources.length > 1 ? 's' : ''}
        <span className="ml-auto text-atlas-muted-2">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {sources.map((source, i) => (
            <div
              key={i}
              className="rounded-sm bg-atlas-surface border border-atlas-line p-2.5 text-[12px]"
            >
              <p className="font-medium text-atlas-ink-2">
                {source.documentTitle}
                {source.chapter && ` · ${source.chapter}`}
                {source.pageStart && ` (p. ${source.pageStart}${source.pageEnd && source.pageEnd !== source.pageStart ? `-${source.pageEnd}` : ''})`}
              </p>
              <p className="mt-1 text-atlas-muted line-clamp-2 text-[11.5px] leading-[1.5]">
                {source.snippet}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Converte Markdown básico em HTML
 * Headings são rebaixados (## → h4, ### → h5) para ficarem proporcionais ao chat
 */
function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h5>$1</h5>')
    .replace(/^## (.*$)/gm, '<h4>$1</h4>')
    .replace(/^# (.*$)/gm, '<h4>$1</h4>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.*)$/, '<p>$1</p>');
}
