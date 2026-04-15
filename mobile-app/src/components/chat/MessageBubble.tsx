import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as colors } from '../../constants/colors';
import { SourceChip } from './SourceChip';
import { LibrarySourceChip } from './LibrarySourceChip';
import type { ChatMessage, ChatSource, MessageFeedback } from '../../types/chat.types';
import type { LibraryMessage, LibrarySource } from '../../types/library.types';

type AnyMessage = ChatMessage | LibraryMessage;

interface MessageBubbleProps {
  message: AnyMessage;
  onFeedback: (id: string, feedback: MessageFeedback) => void;
  variant?: 'chat' | 'library';
}

function isChatSource(source: ChatSource | LibrarySource): source is ChatSource {
  return 'videoId' in source;
}

export function MessageBubble({ message, onFeedback, variant = 'chat' }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isTemp = message.id.startsWith('temp-');
  const feedback = 'feedback' in message ? message.feedback : null;

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
            {message.sources.map((source, idx) =>
              variant === 'library' || !isChatSource(source) ? (
                <LibrarySourceChip key={idx} source={source as LibrarySource} />
              ) : (
                <SourceChip key={idx} source={source} />
              )
            )}
          </View>
        )}

        {/* Feedback (assistant only) */}
        {!isUser && !isTemp && (
          <View style={styles.feedbackRow}>
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                feedback === 'helpful' && styles.feedbackActive,
              ]}
              onPress={() => onFeedback(message.id, 'helpful')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={feedback === 'helpful' ? 'thumbs-up' : 'thumbs-up-outline'}
                size={13}
                color={feedback === 'helpful' ? colors.accent : colors.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                feedback === 'not_helpful' && styles.feedbackActive,
              ]}
              onPress={() => onFeedback(message.id, 'not_helpful')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={feedback === 'not_helpful' ? 'thumbs-down' : 'thumbs-down-outline'}
                size={13}
                color={feedback === 'not_helpful' ? colors.danger : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  sourcesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    paddingTop: 4,
  },
  feedbackButton: {
    padding: 2,
  },
  feedbackActive: {
    opacity: 1,
  },
});
