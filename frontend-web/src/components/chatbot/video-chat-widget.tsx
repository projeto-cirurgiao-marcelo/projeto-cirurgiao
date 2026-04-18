'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X, Send, ThumbsUp, ThumbsDown, Loader2, Sparkles, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { chatbotService, ChatMessage, ChatConversation } from '@/lib/api/chatbot.service';

import { logger } from '@/lib/logger';
interface VideoChatWidgetProps {
  videoId: string;
  courseId: string;
  videoTitle: string;
  onSeekToTimestamp?: (seconds: number) => void;
}

export function VideoChatWidget({ videoId, courseId, videoTitle, onSeekToTimestamp }: VideoChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carregar sugestões contextualizadas ao abrir
  useEffect(() => {
    if (isOpen && suggestions.length === 0) {
      loadSuggestions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Reset conversa quando muda de vídeo
  useEffect(() => {
    setConversation(null);
    setMessages([]);
    setSuggestions([]);
    setError(null);
    if (isOpen) {
      loadSuggestions();
    }
  }, [videoId]);

  const loadSuggestions = async () => {
    try {
      const sug = await chatbotService.getSuggestions({ videoId, courseId });
      setSuggestions(sug);
    } catch (err) {
      logger.error('Erro ao carregar sugestões:', err);
      setSuggestions([
        'Resuma os pontos principais desta aula',
        'Quais são os conceitos mais importantes abordados?',
        'Explique melhor o tema principal desta aula',
      ]);
    }
  };

  const createOrGetConversation = async (): Promise<ChatConversation> => {
    if (conversation) return conversation;
    const newConversation = await chatbotService.createConversation({
      videoId,
      courseId,
      title: `Dúvidas: ${videoTitle}`,
    });
    setConversation(newConversation);
    return newConversation;
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);
    setInputValue('');

    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: conversation?.id || '',
      role: 'user',
      content: message,
      sources: null,
      feedback: null,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const conv = await createOrGetConversation();
      const response = await chatbotService.sendMessage(conv.id, {
        message,
        videoId,
        courseId,
      });

      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMessage.id),
        response.userMessage,
        response.assistantMessage,
      ]);

      if (response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
      }
    } catch (err: any) {
      logger.error('Erro ao enviar mensagem:', err);
      setError('Erro ao enviar mensagem. Tente novamente.');
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (messageId: string, feedback: 'helpful' | 'not_helpful') => {
    try {
      await chatbotService.addFeedback(messageId, feedback);
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, feedback } : m))
      );
    } catch (err) {
      logger.error('Erro ao enviar feedback:', err);
    }
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMarkdown = (text: string): string => {
    return text
      .replace(/^### (.*$)/gim, '<h3 class="font-semibold text-base mt-3 mb-1">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="font-semibold text-lg mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="font-bold text-xl mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/\n/g, '<br />');
  };

  return (
    <>
      {/* Botão flutuante - posicionado à direita, acima do botão genérico */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.2, type: 'spring' }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className={cn(
            'rounded-full w-14 h-14 shadow-lg',
            isOpen
              ? 'bg-gray-600 hover:bg-gray-700'
              : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'
          )}
          title="Dúvidas sobre esta aula"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
              >
                <X className="h-6 w-6" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
              >
                <BookOpen className="h-6 w-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Janela do chat contextualizado */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-50 w-[400px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-150px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header - visual distinto do chat genérico */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold">Tutor da Aula</h3>
                  <p className="text-xs text-white/80 truncate">
                    {videoTitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Mensagens */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800"
              style={{ maxHeight: 'calc(100% - 140px)' }}
            >
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center text-muted-foreground py-6">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-purple-500/50" />
                    <p className="font-medium">Tutor desta aula</p>
                    <p className="text-sm mt-1">
                      Tire dúvidas sobre o conteúdo da aula com base na transcrição
                    </p>
                  </div>

                  {suggestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Sugestões:</p>
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSendMessage(suggestion)}
                          className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors text-sm"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-4 py-3',
                          message.role === 'user'
                            ? 'bg-purple-500 text-white rounded-br-md'
                            : 'bg-muted rounded-bl-md'
                        )}
                      >
                        <div
                          className={cn(
                            "text-sm whitespace-pre-wrap",
                            message.role === 'assistant' && "prose prose-sm dark:prose-invert max-w-none"
                          )}
                          dangerouslySetInnerHTML={{
                            __html: message.role === 'assistant'
                              ? formatMarkdown(message.content)
                              : message.content
                          }}
                        />

                        {/* Sources com timestamps clicáveis */}
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Referências na aula:
                            </p>
                            {message.sources.map((source, idx) => (
                              <button
                                key={idx}
                                onClick={() => onSeekToTimestamp?.(source.timestamp)}
                                className="flex items-center gap-2 text-xs text-purple-600 hover:text-purple-700 hover:underline"
                              >
                                <Clock className="h-3 w-3" />
                                <span className="font-mono">
                                  {formatTimestamp(source.timestamp)}
                                </span>
                                <span className="truncate">{source.videoTitle || 'Ir para este trecho'}</span>
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Feedback */}
                        {message.role === 'assistant' && !message.id.startsWith('temp-') && (
                          <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Útil?</span>
                            <button
                              onClick={() => handleFeedback(message.id, 'helpful')}
                              className={cn(
                                'p-1 rounded hover:bg-background/50 transition-colors',
                                message.feedback === 'helpful' && 'text-purple-500'
                              )}
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleFeedback(message.id, 'not_helpful')}
                              className={cn(
                                'p-1 rounded hover:bg-background/50 transition-colors',
                                message.feedback === 'not_helpful' && 'text-red-500'
                              )}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Analisando a aula...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputValue);
                }}
                className="flex gap-2"
              >
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Pergunte sobre esta aula..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
