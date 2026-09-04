import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { chatbotService } from '../../services/api/chatbot.service';
import { libraryService } from '../../services/api/library.service';
import { logger } from '../../lib/logger';
import { MessageBubble } from './MessageBubble';
import type { VideoCitation } from './MarkdownText';
import { Colors as colors } from '../../constants/colors';
import type {
  ChatConversation,
  ChatMessage,
  ChatType,
  MessageFeedback,
} from '../../types/chat.types';
import type {
  LibraryConversation,
  LibraryMessage,
  TokenQuota,
} from '../../types/library.types';

type AnyConversation = ChatConversation | LibraryConversation;
type AnyMessage = ChatMessage | LibraryMessage;

const HEADER_CONFIG: Record<ChatType, {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  emptyTitle: string;
  emptyText: string;
  placeholder: string;
  thinkingText: string;
}> = {
  general: {
    title: 'Mentor IA',
    icon: 'chatbubbles-outline',
    emptyTitle: 'Como posso ajudar?',
    emptyText: 'Pergunte sobre seus estudos, procedimentos cirurgicos ou qualquer duvida geral.',
    placeholder: 'Digite sua pergunta...',
    thinkingText: 'Mentor IA esta pensando...',
  },
  video: {
    title: 'Duvidas da Aula',
    icon: 'sparkles',
    emptyTitle: 'Duvidas sobre esta aula?',
    emptyText: 'Pergunte sobre o conteudo desta aula. O Mentor conhece o material e pode te ajudar!',
    placeholder: 'Pergunte sobre esta aula...',
    thinkingText: 'Mentor IA esta pensando...',
  },
  library: {
    title: 'Biblioteca IA',
    icon: 'book-outline',
    emptyTitle: 'Consulte a Biblioteca',
    emptyText: 'Faca perguntas sobre os livros e materiais de referencia em Medicina Veterinaria.',
    placeholder: 'Pergunte sobre os livros...',
    thinkingText: 'Biblioteca IA esta pesquisando...',
  },
};

interface ChatModalProps {
  visible: boolean;
  chatType: ChatType;
  onClose: () => void;
  videoId?: string;
  courseId?: string;
  videoTitle?: string;
  /**
   * `sheet`: painel inferior com ~62% da altura e margens laterais, deixando
   * o player visível e tocando por cima (tela de aula). `fullscreen`: modal
   * de tela cheia (aba Mentor IA). Padrão: fullscreen.
   */
  presentation?: 'fullscreen' | 'sheet';
  /** Toque numa citação "📹 [aula] - MM:SS" da resposta (ex.: pular o player). */
  onCitationPress?: (citation: VideoCitation) => void;
}

/** Altura do painel: 62% da janela, mas nunca menos que 360 (paisagem). */
function sheetHeightFor(windowHeight: number): number {
  return Math.min(windowHeight - 24, Math.max(360, Math.round(windowHeight * 0.62)));
}

export function ChatModal({
  visible,
  chatType,
  onClose,
  videoId,
  courseId,
  videoTitle,
  presentation = 'fullscreen',
  onCitationPress,
}: ChatModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const isSheet = presentation === 'sheet';
  const [conversation, setConversation] = useState<AnyConversation | null>(null);
  const [messages, setMessages] = useState<AnyMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [quota, setQuota] = useState<TokenQuota | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const suggestionsLoadedRef = useRef(false);

  const config = HEADER_CONFIG[chatType];
  const variant = chatType === 'library' ? 'library' : 'chat';

  // Load suggestions when modal opens
  const handleShow = useCallback(async () => {
    if (suggestionsLoadedRef.current) return;
    suggestionsLoadedRef.current = true;
    setLoadingSuggestions(true);
    try {
      if (chatType === 'library') {
        const [sug, q] = await Promise.all([
          libraryService.getSuggestions(),
          libraryService.getQuota(),
        ]);
        setSuggestions(sug);
        setQuota(q);
      } else {
        const sug = await chatbotService.getSuggestions(
          chatType === 'video' ? videoId : undefined,
          chatType === 'video' ? courseId : undefined,
        );
        setSuggestions(sug);
      }
    } catch (error) {
      logger.error('Erro ao carregar sugestoes:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [chatType, videoId, courseId]);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setConversation(null);
    setMessages([]);
    setSuggestions([]);
    setInputText('');
    setQuota(null);
    suggestionsLoadedRef.current = false;
    onClose();
  }, [onClose]);

  const ensureConversation = async (): Promise<AnyConversation> => {
    if (conversation) return conversation;

    let newConv: AnyConversation;
    if (chatType === 'library') {
      newConv = await libraryService.createConversation();
    } else {
      newConv = await chatbotService.createConversation(
        chatType === 'video' ? { videoId, courseId } : {},
      );
    }
    setConversation(newConv);
    return newConv;
  };

  const handleSendMessage = useCallback(async (text?: string) => {
    const messageText = (text || inputText).trim();
    if (!messageText || sending) return;

    try {
      setSending(true);
      setInputText('');

      const conv = await ensureConversation();

      // Optimistic user message
      const tempId = `temp-${Date.now()}`;
      const tempMsg: AnyMessage = {
        id: tempId,
        conversationId: conv.id,
        role: 'user',
        content: messageText,
        sources: null,
        feedback: null,
        createdAt: new Date().toISOString(),
        ...(chatType === 'library' ? { tokenCount: null } : {}),
      } as AnyMessage;
      setMessages((prev) => [...prev, tempMsg]);

      if (chatType === 'library') {
        const response = await libraryService.sendMessage(conv.id, messageText);
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempId);
          return [...filtered, response.userMessage, response.assistantMessage];
        });
        // Refresh quota
        libraryService.getQuota().then(setQuota).catch(() => {});
      } else {
        const response = await chatbotService.sendMessage(conv.id, {
          message: messageText,
          ...(chatType === 'video' ? { videoId, courseId } : {}),
        });
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempId);
          return [...filtered, response.userMessage, response.assistantMessage];
        });
        if (response.suggestions.length > 0) {
          setSuggestions(response.suggestions);
        }
      }
    } catch (error) {
      logger.error('Erro ao enviar mensagem:', error);
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      Alert.alert('Erro', 'Nao foi possivel enviar a mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  }, [inputText, sending, conversation, chatType, videoId, courseId]);

  const handleFeedback = async (messageId: string, feedback: MessageFeedback) => {
    try {
      if (chatType === 'library') {
        await libraryService.addFeedback(messageId, feedback);
      } else {
        await chatbotService.addFeedback(messageId, feedback);
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedback } : m))
      );
    } catch (error) {
      logger.error('Erro ao enviar feedback:', error);
    }
  };

  const subtitle = chatType === 'video' && videoTitle
    ? videoTitle
    : chatType === 'library' && quota
      ? `${quota.tokensUsed}/${quota.dailyLimit} consultas hoje`
      : undefined;

  // Conteúdo (header + corpo) é o mesmo nos dois modos; muda só a moldura.
  const content = (
    <>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <Ionicons name={config.icon} size={14} color={colors.accent} />
              <Text style={styles.headerTitle}>{config.title}</Text>
            </View>
            {subtitle && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          <View style={{ width: 32 }} />
        </View>

        <KeyboardAvoidingView
          style={styles.chatBody}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {loadingSuggestions && messages.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.loadingText}>Preparando assistente...</Text>
            </View>
          ) : (
            <>
              {/* Messages */}
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesContent}
                onContentSizeChange={() =>
                  flatListRef.current?.scrollToEnd({ animated: true })
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                      <Ionicons name={config.icon} size={28} color={colors.accent} />
                    </View>
                    <Text style={styles.emptyTitle}>{config.emptyTitle}</Text>
                    <Text style={styles.emptyText}>{config.emptyText}</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <MessageBubble
                    message={item}
                    onFeedback={handleFeedback}
                    variant={variant}
                    onCitationPress={onCitationPress}
                  />
                )}
              />

              {/* Typing indicator */}
              {sending && (
                <View style={styles.typingContainer}>
                  <View style={styles.typingDots}>
                    <View style={[styles.typingDot, { opacity: 0.4 }]} />
                    <View style={[styles.typingDot, { opacity: 0.6 }]} />
                    <View style={[styles.typingDot, { opacity: 0.8 }]} />
                  </View>
                  <Text style={styles.typingText}>{config.thinkingText}</Text>
                </View>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && messages.length <= 1 && !sending && (
                <View style={styles.suggestionsContainer}>
                  {suggestions.slice(0, 3).map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionChip}
                      onPress={() => handleSendMessage(suggestion)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chatbubble-outline" size={12} color={colors.accent} />
                      <Text style={styles.suggestionText} numberOfLines={2}>
                        {suggestion}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={config.placeholder}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={2000}
                  editable={!sending}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || sending) && styles.sendButtonDisabled,
                  ]}
                  onPress={() => handleSendMessage()}
                  disabled={!inputText.trim() || sending}
                  activeOpacity={0.8}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
    </>
  );

  if (isSheet) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleClose}
        onShow={handleShow}
      >
        <View style={styles.sheetRoot}>
          {/* Toque fora fecha — o player continua visível e tocando atrás. */}
          <Pressable
            style={styles.sheetBackdrop}
            onPress={handleClose}
            accessibilityLabel="Fechar"
          />
          {/* Android: o sistema redimensiona a janela do Modal com o teclado
              (softwareKeyboardLayoutMode resize); só o iOS precisa do padding. */}
          <KeyboardAvoidingView
            style={styles.sheetKeyboard}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            pointerEvents="box-none"
          >
            <SafeAreaView
              style={[styles.sheet, { height: sheetHeightFor(windowHeight) }]}
              edges={['bottom']}
            >
              <View style={styles.grabber} />
              {content}
            </SafeAreaView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      onShow={handleShow}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        {content}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ---- Modo painel (tela de aula) ----
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 20, 43, 0.35)',
  },
  sheetKeyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    // Altura definida (o corpo do chat usa flex:1 dentro dela); maxHeight
    // deixa encolher quando o teclado reduz a janela.
    maxHeight: '100%',
    marginHorizontal: 10,
    backgroundColor: colors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: 8,
    marginBottom: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    maxWidth: '80%',
  },
  chatBody: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.accent}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  messagesContent: {
    padding: 12,
    paddingBottom: 4,
    flexGrow: 1,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  typingText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    gap: 6,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: colors.accent,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    gap: 8,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
