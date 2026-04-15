import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { chatbotService } from '../../services/api/chatbot.service';
import { libraryService } from '../../services/api/library.service';
import { ChatConversationList } from './ChatConversationList';
import { ExpandableFAB } from './ExpandableFAB';
import { ChatModal } from './ChatModal';
import { MessageBubble } from './MessageBubble';
import useChatStore from '../../stores/chat-store';
import type {
  ChatConversation,
  ChatMessage,
  ChatType,
  MessageFeedback,
} from '../../types/chat.types';
import type { LibraryConversation, LibraryMessage } from '../../types/library.types';
import { Colors as colors } from '../../constants/colors';

const TAB_CLEARANCE = 100;

type AnyConversation = (ChatConversation | LibraryConversation) & { _segment: string };
type AnyMessage = ChatMessage | LibraryMessage;
type ScreenView = 'list' | 'chat';

export function ChatScreen() {
  const [view, setView] = useState<ScreenView>('list');
  const [activeConversation, setActiveConversation] = useState<AnyConversation | null>(null);
  const [messages, setMessages] = useState<AnyMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const modalChatType = useChatStore((s) => s.modalChatType);
  const closeChat = useChatStore((s) => s.closeChat);

  const handleSelectConversation = useCallback(async (conversation: AnyConversation) => {
    try {
      setView('chat');
      setActiveConversation(conversation);
      setMessages([]);

      if (conversation._segment === 'library') {
        const full = await libraryService.getConversation(conversation.id);
        setMessages(full.messages || []);
        setActiveConversation({ ...full, _segment: 'library' });
      } else {
        const full = await chatbotService.getConversation(conversation.id);
        setMessages(full.messages || []);
        setActiveConversation({ ...full, _segment: conversation._segment });
      }
    } catch (error) {
      console.error('Erro ao carregar conversa:', error);
      Alert.alert('Erro', 'Nao foi possivel carregar a conversa.');
      setView('list');
    }
  }, []);

  const handleFABSelect = useCallback((type: ChatType) => {
    useChatStore.getState().openChat(type);
  }, []);

  const handleSendMessage = useCallback(async (text?: string) => {
    const messageText = (text || inputText).trim();
    if (!messageText || !activeConversation || sending) return;

    const isLibrary = activeConversation._segment === 'library';

    try {
      setSending(true);
      setInputText('');

      const tempId = `temp-${Date.now()}`;
      const tempMsg: AnyMessage = {
        id: tempId,
        conversationId: activeConversation.id,
        role: 'user',
        content: messageText,
        sources: null,
        feedback: null,
        createdAt: new Date().toISOString(),
        ...(isLibrary ? { tokenCount: null } : {}),
      } as AnyMessage;
      setMessages((prev) => [...prev, tempMsg]);

      if (isLibrary) {
        const response = await libraryService.sendMessage(activeConversation.id, messageText);
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempId);
          return [...filtered, response.userMessage, response.assistantMessage];
        });
      } else {
        const chatConv = activeConversation as ChatConversation & { _segment: string };
        const response = await chatbotService.sendMessage(chatConv.id, {
          message: messageText,
          ...(chatConv.videoId ? { videoId: chatConv.videoId, courseId: chatConv.courseId ?? undefined } : {}),
        });
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempId);
          return [...filtered, response.userMessage, response.assistantMessage];
        });
        if (response.suggestions.length > 0) {
          setSuggestions(response.suggestions);
        }
      }

      // Update title if first message
      if (!activeConversation.title) {
        setActiveConversation((prev) =>
          prev ? { ...prev, title: messageText.substring(0, 50) } : prev
        );
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      Alert.alert('Erro', 'Nao foi possivel enviar a mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  }, [inputText, activeConversation, sending]);

  const handleFeedback = async (messageId: string, feedback: MessageFeedback) => {
    const isLibrary = activeConversation?._segment === 'library';
    try {
      if (isLibrary) {
        await libraryService.addFeedback(messageId, feedback);
      } else {
        await chatbotService.addFeedback(messageId, feedback);
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedback } : m))
      );
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
    }
  };

  const handleBackToList = () => {
    setView('list');
    setActiveConversation(null);
    setMessages([]);
    setSuggestions([]);
  };

  const variant = activeConversation?._segment === 'library' ? 'library' : 'chat';

  const headerTitle = activeConversation?.title || 'Nova conversa';
  const headerSubtitle =
    activeConversation?._segment === 'library'
      ? 'Biblioteca IA'
      : activeConversation?._segment === 'video'
        ? 'Duvidas da Aula'
        : 'Mentor IA';

  // ===== VIEW: LIST =====
  if (view === 'list') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.listHeader}>
          <View style={styles.listHeaderLeft}>
            <View style={styles.headerIcon}>
              <Ionicons name="sparkles" size={18} color="#fff" />
            </View>
            <View>
              <Text style={styles.listHeaderTitle}>Mentor IA</Text>
              <Text style={styles.listHeaderSubtitle}>Seu assistente de estudos</Text>
            </View>
          </View>
        </View>

        <ChatConversationList
          onSelectConversation={handleSelectConversation}
          bottomInset={TAB_CLEARANCE}
        />

        <ExpandableFAB
          showVideoOption={false}
          bottomOffset={TAB_CLEARANCE + 16}
          onSelectOption={handleFABSelect}
        />

        <ChatModal
          visible={modalChatType !== null}
          chatType={modalChatType || 'general'}
          onClose={closeChat}
        />
      </SafeAreaView>
    );
  }

  // ===== VIEW: CHAT =====
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Chat header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          onPress={handleBackToList}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.chatHeaderCenter}>
          <Text style={styles.chatHeaderTitle} numberOfLines={1}>
            {headerTitle}
          </Text>
          <Text style={styles.chatHeaderSubtitle}>{headerSubtitle}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatBody}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={styles.chatEmptyContainer}>
              <Ionicons name="sparkles" size={32} color={colors.accent} />
              <Text style={styles.chatEmptyTitle}>Como posso ajudar?</Text>
              <Text style={styles.chatEmptyText}>
                Pergunte sobre suas aulas, procedimentos ou qualquer duvida de estudo.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              onFeedback={handleFeedback}
              variant={variant}
            />
          )}
        />

        {sending && (
          <View style={styles.typingContainer}>
            <View style={styles.typingDots}>
              <View style={[styles.typingDot, styles.typingDot1]} />
              <View style={[styles.typingDot, styles.typingDot2]} />
              <View style={[styles.typingDot, styles.typingDot3]} />
            </View>
            <Text style={styles.typingText}>
              {activeConversation?._segment === 'library'
                ? 'Biblioteca IA esta pesquisando...'
                : 'Mentor IA esta pensando...'}
            </Text>
          </View>
        )}

        {suggestions.length > 0 && messages.length <= 1 && !sending && (
          <View style={[styles.suggestionsContainer, { marginBottom: TAB_CLEARANCE }]}>
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => handleSendMessage(suggestion)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {suggestion}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={[styles.inputContainer, { marginBottom: TAB_CLEARANCE }]}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Digite sua pergunta..."
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  listHeaderSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  chatHeaderCenter: {
    flex: 1,
  },
  chatHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  chatHeaderSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  chatBody: {
    flex: 1,
  },
  messagesContent: {
    padding: 12,
    paddingBottom: 4,
    flexGrow: 1,
  },
  chatEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  chatEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  chatEmptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 20,
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
  typingDot1: { opacity: 0.4 },
  typingDot2: { opacity: 0.6 },
  typingDot3: { opacity: 0.8 },
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
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  suggestionText: {
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

export default ChatScreen;
