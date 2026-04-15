import React, { useState, useCallback, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { chatbotService } from '../../services/api/chatbot.service';
import type {
  ChatConversation,
  ChatMessage,
  ChatSource,
  MessageFeedback,
} from '../../types/chat.types';
import { Colors as colors } from '../../constants/colors';

interface VideoAIChatBubbleProps {
  videoId: string;
  courseId?: string;
  videoTitle?: string;
}

export function VideoAIChatBubble({ videoId, courseId, videoTitle }: VideoAIChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleOpen = useCallback(async () => {
    setIsOpen(true);

    if (!conversation) {
      try {
        setLoadingConversation(true);

        // Load suggestions for this video
        const sug = await chatbotService.getSuggestions(videoId, courseId);
        setSuggestions(sug);
      } catch (error) {
        console.error('Erro ao carregar sugestoes:', error);
      } finally {
        setLoadingConversation(false);
      }
    }
  }, [conversation, videoId, courseId]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const ensureConversation = async (): Promise<ChatConversation> => {
    if (conversation) return conversation;

    const newConversation = await chatbotService.createConversation({
      videoId,
      courseId,
    });
    setConversation(newConversation);
    return newConversation;
  };

  const handleSendMessage = useCallback(async (text?: string) => {
    const messageText = (text || inputText).trim();
    if (!messageText || sending) return;

    try {
      setSending(true);
      setInputText('');

      // Ensure we have a conversation
      const conv = await ensureConversation();

      // Optimistic: add user message
      const tempUserMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversationId: conv.id,
        role: 'user',
        content: messageText,
        sources: null,
        feedback: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      const response = await chatbotService.sendMessage(conv.id, {
        message: messageText,
        videoId,
        courseId,
      });

      // Replace temp with real messages
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...filtered, response.userMessage, response.assistantMessage];
      });

      if (response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      Alert.alert('Erro', 'Nao foi possivel enviar a mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  }, [inputText, sending, conversation, videoId, courseId]);

  const handleFeedback = async (messageId: string, feedback: MessageFeedback) => {
    try {
      await chatbotService.addFeedback(messageId, feedback);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedback } : m))
      );
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpen}
        activeOpacity={0.8}
      >
        <Ionicons name="sparkles" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
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
                <Ionicons name="sparkles" size={14} color={colors.accent} />
                <Text style={styles.headerTitle}>Mentor IA</Text>
              </View>
              {videoTitle && (
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {videoTitle}
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
            {loadingConversation ? (
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
                        <Ionicons name="sparkles" size={28} color={colors.accent} />
                      </View>
                      <Text style={styles.emptyTitle}>Duvidas sobre esta aula?</Text>
                      <Text style={styles.emptyText}>
                        Pergunte ao Mentor IA sobre o conteudo desta aula. Ele conhece o material e pode te ajudar!
                      </Text>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <MessageBubble
                      message={item}
                      onFeedback={handleFeedback}
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
                    <Text style={styles.typingText}>Mentor IA esta pensando...</Text>
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
                    placeholder="Pergunte sobre esta aula..."
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
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ===== Sub-components =====

function MessageBubble({
  message,
  onFeedback,
}: {
  message: ChatMessage;
  onFeedback: (id: string, feedback: MessageFeedback) => void;
}) {
  const isUser = message.role === 'user';
  const isTemp = message.id.startsWith('temp-');

  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.bubbleAvatar}>
          <Ionicons name="sparkles" size={12} color={colors.accent} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
          isTemp && styles.bubbleTemp,
        ]}
      >
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {message.content}
        </Text>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <View style={styles.sourcesContainer}>
            {message.sources.map((source: ChatSource, idx: number) => (
              <View key={idx} style={styles.sourceChip}>
                <Ionicons name="videocam-outline" size={11} color={colors.accent} />
                <Text style={styles.sourceChipText} numberOfLines={1}>
                  {source.videoTitle || 'Video'}
                </Text>
                <Text style={styles.sourceChipTime}>
                  {formatTimestamp(source.timestamp)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Feedback (assistant only) */}
        {!isUser && !isTemp && (
          <View style={styles.feedbackRow}>
            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={() => onFeedback(message.id, 'helpful')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={message.feedback === 'helpful' ? 'thumbs-up' : 'thumbs-up-outline'}
                size={13}
                color={message.feedback === 'helpful' ? colors.accent : colors.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={() => onFeedback(message.id, 'not_helpful')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={message.feedback === 'not_helpful' ? 'thumbs-down' : 'thumbs-down-outline'}
                size={13}
                color={message.feedback === 'not_helpful' ? colors.danger : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// ===== Styles =====

const styles = StyleSheet.create({
  // FAB
  fab: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    zIndex: 100,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
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

  // Loading
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

  // Empty
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

  // Messages
  messagesContent: {
    padding: 12,
    paddingBottom: 4,
    flexGrow: 1,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
    gap: 6,
  },
  bubbleRowUser: {
    flexDirection: 'row-reverse',
  },
  bubbleAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.accent}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '78%',
    padding: 10,
    borderRadius: 12,
  },
  bubbleUser: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  bubbleTemp: {
    opacity: 0.7,
  },
  bubbleText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: '#fff',
  },

  // Sources
  sourcesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${colors.accent}10`,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sourceChipText: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '500',
    maxWidth: 100,
  },
  sourceChipTime: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '600',
  },

  // Feedback
  feedbackRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    paddingTop: 4,
  },
  feedbackButton: {
    padding: 2,
  },

  // Typing
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

  // Suggestions
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

  // Input
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

export default VideoAIChatBubble;
