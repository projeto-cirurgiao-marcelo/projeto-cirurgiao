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
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadQuota = async () => {
    try {
      const data = await libraryService.getQuota();
      setQuota(data);
    } catch (error) {
      console.error('Erro ao carregar cota:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const data = await libraryService.getSuggestions();
      setSuggestions(data);
    } catch (error) {
      console.error('Erro ao carregar sugestões:', error);
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
      console.error('Erro ao carregar conversa:', error);
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
      console.error('Erro ao criar conversa:', error);
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
      console.error('Erro ao deletar conversa:', error);
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
        console.error('Erro ao criar conversa:', error);
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
      console.error('Erro ao enviar feedback:', error);
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
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Sidebar de Conversas */}
      <div
        className={cn(
          'flex flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50',
          'w-full md:w-80 md:flex',
          showSidebar ? 'flex' : 'hidden md:flex',
        )}
      >
        {/* Header da sidebar */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Biblioteca IA</h2>
          </div>
          <button
            onClick={createNewConversation}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            title="Nova conversa"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Lista de conversas */}
        <div className="flex-1 overflow-y-auto p-2">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>Nenhuma conversa ainda</p>
              <p className="mt-1 text-xs">Clique em + para começar</p>
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
                  'group mb-1 flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition',
                  activeConversation?.id === conv.id
                    ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300'
                    : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800',
                )}
              >
                <span className="truncate">{conv.title || 'Conversa sem título'}</span>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="ml-2 hidden shrink-0 rounded p-1 text-gray-400 transition hover:bg-red-100 hover:text-red-600 group-hover:block dark:hover:bg-red-900/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cota de tokens */}
        {quota && (
          <div className="border-t border-gray-200 p-4 dark:border-gray-800">
            <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Cota diária</span>
              <span>
                {quota.tokensUsed.toLocaleString()} / {quota.dailyLimit.toLocaleString()}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  quotaPercentage > 90
                    ? 'bg-red-500'
                    : quotaPercentage > 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-500',
                )}
                style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {quota.tokensRemaining.toLocaleString()} tokens restantes
            </p>
          </div>
        )}
      </div>

      {/* Área principal do chat */}
      <div className="flex flex-1 flex-col">
        {/* Header do chat */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <button
            onClick={() => setShowSidebar(true)}
            className="md:hidden rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {activeConversation?.title || 'Nova conversa'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Consulte os livros de Medicina Veterinária
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
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
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <BookOpen className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Consultando a biblioteca...
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <div className="mx-auto max-w-3xl">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre medicina veterinária..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-emerald-500"
                disabled={isSending || (quota?.tokensRemaining === 0)}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isSending || (quota?.tokensRemaining === 0)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
            {quota?.tokensRemaining === 0 && (
              <p className="mt-2 text-xs text-red-500">
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
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
        <BookOpen className="h-8 w-8 text-emerald-600" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
        Biblioteca IA
      </h2>
      <p className="mb-8 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
        Consulte os livros-texto de Medicina Veterinária usando inteligência artificial.
        Faça perguntas e receba respostas fundamentadas com citações das fontes.
      </p>

      {suggestions.length > 0 && (
        <div className="w-full max-w-lg">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
            Sugestões de perguntas
          </p>
          <div className="grid gap-2">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(suggestion)}
                className="rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-900/10"
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
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-blue-100 dark:bg-blue-900/30'
            : 'bg-emerald-100 dark:bg-emerald-900/30',
        )}
      >
        {isUser ? (
          <span className="text-xs font-medium text-blue-600">Eu</span>
        ) : (
          <BookOpen className="h-4 w-4 text-emerald-600" />
        )}
      </div>

      {/* Conteúdo */}
      <div className={cn('max-w-[85%] space-y-2', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm',
            isUser
              ? 'rounded-tr-sm bg-blue-600 text-white'
              : 'rounded-tl-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div
              className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-h4:text-[0.875rem] prose-h5:text-[0.8125rem] prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5"
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
              onClick={() => onFeedback(message.id, 'helpful')}
              className={cn(
                'rounded-lg p-1.5 text-gray-400 transition hover:text-emerald-600',
                message.feedback === 'helpful' && 'text-emerald-600',
              )}
              title="Resposta útil"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onFeedback(message.id, 'not_helpful')}
              className={cn(
                'rounded-lg p-1.5 text-gray-400 transition hover:text-red-500',
                message.feedback === 'not_helpful' && 'text-red-500',
              )}
              title="Resposta não útil"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
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
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400"
      >
        <Info className="h-3.5 w-3.5" />
        {sources.length} fonte{sources.length > 1 ? 's' : ''} consultada{sources.length > 1 ? 's' : ''}
        <span className="ml-auto text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {sources.map((source, i) => (
            <div
              key={i}
              className="rounded-lg bg-white p-2.5 text-xs dark:bg-gray-800"
            >
              <p className="font-medium text-gray-700 dark:text-gray-300">
                📚 {source.documentTitle}
                {source.chapter && ` - ${source.chapter}`}
                {source.pageStart && ` (p. ${source.pageStart}${source.pageEnd && source.pageEnd !== source.pageStart ? `-${source.pageEnd}` : ''})`}
              </p>
              <p className="mt-1 text-gray-500 dark:text-gray-400 line-clamp-2">
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
