import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { chatbotService } from '../../services/api/chatbot.service';
import { libraryService } from '../../services/api/library.service';
import { logger } from '../../lib/logger';
import { Colors as colors } from '../../constants/colors';
import type { ChatConversation } from '../../types/chat.types';
import type { LibraryConversation } from '../../types/library.types';

type Segment = 'general' | 'video' | 'library';

type AnyConversation = (ChatConversation | LibraryConversation) & {
  _segment: Segment;
};

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'general', label: 'Geral' },
  { key: 'video', label: 'Aulas' },
  { key: 'library', label: 'Biblioteca' },
];

interface ChatConversationListProps {
  onSelectConversation: (conversation: AnyConversation) => void;
  bottomInset: number;
}

export function ChatConversationList({
  onSelectConversation,
  bottomInset,
}: ChatConversationListProps) {
  const [activeSegment, setActiveSegment] = useState<Segment>('general');
  const [conversations, setConversations] = useState<AnyConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async (segment: Segment) => {
    try {
      if (segment === 'library') {
        const data = await libraryService.listConversations(50);
        const mapped: AnyConversation[] = data.conversations.map((c) => ({
          ...c,
          _segment: 'library' as const,
        }));
        setConversations(mapped);
      } else {
        const data = await chatbotService.listConversations(50, 0, segment);
        const mapped: AnyConversation[] = data.conversations.map((c) => ({
          ...c,
          _segment: segment,
        }));
        setConversations(mapped);
      }
    } catch (err) {
      logger.error('Erro ao carregar conversas:', err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadConversations(activeSegment).finally(() => setLoading(false));
  }, [activeSegment, loadConversations]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversations(activeSegment);
    setRefreshing(false);
  };

  const handleDelete = (conversation: AnyConversation) => {
    Alert.alert('Excluir conversa', 'Tem certeza que deseja excluir esta conversa?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            if (conversation._segment === 'library') {
              await libraryService.deleteConversation(conversation.id);
            } else {
              await chatbotService.deleteConversation(conversation.id);
            }
            setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
          } catch (error) {
            logger.error('Erro ao excluir conversa:', error);
            Alert.alert('Erro', 'Nao foi possivel excluir a conversa.');
          }
        },
      },
    ]);
  };

  const getConversationIcon = (segment: Segment): keyof typeof Ionicons.glyphMap => {
    switch (segment) {
      case 'video': return 'videocam-outline';
      case 'library': return 'book-outline';
      default: return 'chatbubble-outline';
    }
  };

  const getSubtitle = (conv: AnyConversation): string | null => {
    if (conv._segment === 'video' && 'videoId' in conv && conv.videoId) {
      return 'Duvida sobre aula';
    }
    if (conv._segment === 'library') {
      return 'Biblioteca IA';
    }
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Segment Control */}
      <SegmentControl
        activeSegment={activeSegment}
        onChangeSegment={setActiveSegment}
      />

      {/* Conversation List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>Carregando conversas...</Text>
        </View>
      ) : conversations.length > 0 ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + 72 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          renderItem={({ item }) => {
            const subtitle = getSubtitle(item);
            return (
              <TouchableOpacity
                style={styles.conversationCard}
                onPress={() => onSelectConversation(item)}
                activeOpacity={0.7}
              >
                <View style={styles.conversationIcon}>
                  <Ionicons
                    name={getConversationIcon(item._segment)}
                    size={16}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.conversationInfo}>
                  <Text style={styles.conversationTitle} numberOfLines={1}>
                    {item.title || 'Nova conversa'}
                  </Text>
                  <View style={styles.conversationMeta}>
                    {subtitle && (
                      <Text style={styles.conversationSubtitle} numberOfLines={1}>
                        {subtitle}
                      </Text>
                    )}
                    <Text style={styles.conversationDate}>
                      {formatDate(item.updatedAt)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name={getConversationIcon(activeSegment)}
              size={40}
              color={colors.textMuted}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {activeSegment === 'general' && 'Nenhuma conversa geral'}
            {activeSegment === 'video' && 'Nenhuma conversa de aula'}
            {activeSegment === 'library' && 'Nenhuma consulta na biblioteca'}
          </Text>
          <Text style={styles.emptyText}>
            {activeSegment === 'general' && 'Use o botao abaixo para iniciar uma conversa com o Mentor IA.'}
            {activeSegment === 'video' && 'Conversas sobre aulas aparecem aqui quando voce faz perguntas durante um video.'}
            {activeSegment === 'library' && 'Consulte livros e materiais de referencia usando a Biblioteca IA.'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ===== Segment Control =====

function SegmentControl({
  activeSegment,
  onChangeSegment,
}: {
  activeSegment: Segment;
  onChangeSegment: (segment: Segment) => void;
}) {
  const activeIndex = SEGMENTS.findIndex((s) => s.key === activeSegment);
  const translateX = useSharedValue(0);
  const [trackWidth, setTrackWidth] = useState(0);

  const segmentW = trackWidth > 0 ? (trackWidth - 6) / SEGMENTS.length : 0; // 6 = padding*2

  useEffect(() => {
    if (segmentW > 0) {
      translateX.value = withSpring(activeIndex * segmentW, { damping: 15, stiffness: 120 });
    }
  }, [activeIndex, segmentW]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: segmentW > 0 ? segmentW : 0,
  }));

  return (
    <View style={styles.segmentContainer}>
      <View
        style={styles.segmentTrack}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        {trackWidth > 0 && (
          <Animated.View style={[styles.segmentIndicator, indicatorStyle]} />
        )}
        {SEGMENTS.map((segment) => (
          <TouchableOpacity
            key={segment.key}
            style={styles.segmentButton}
            onPress={() => onChangeSegment(segment.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentLabel,
                activeSegment === segment.key && styles.segmentLabelActive,
              ]}
            >
              {segment.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) return 'Agora';
  if (diffHours < 24) return `${Math.floor(diffHours)}h`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Segment control
  segmentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 3,
    position: 'relative',
  },
  segmentIndicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    backgroundColor: colors.card,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    zIndex: 1,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  segmentLabelActive: {
    color: colors.text,
    fontWeight: '600',
  },

  // List
  listContent: {
    padding: 12,
    gap: 8,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 10,
  },
  conversationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.accent}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationInfo: {
    flex: 1,
    gap: 2,
  },
  conversationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  conversationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  conversationSubtitle: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '500',
  },
  conversationDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  deleteButton: {
    padding: 6,
  },

  // States
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
    padding: 32,
    gap: 10,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.accent}10`,
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
});
