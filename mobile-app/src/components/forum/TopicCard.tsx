/**
 * Card de tópico do fórum
 * Exibe título, preview do conteúdo, autor, stats e badges
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ForumTopic } from '../../types';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../constants/colors';

interface TopicCardProps {
  topic: ForumTopic;
  onPress: (topic: ForumTopic) => void;
}

/** Formata data relativa simples (ex: "2h", "3d", "1sem") */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;
  if (diffWeek < 4) return `${diffWeek}sem`;
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

/** Pega iniciais do nome */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function TopicCard({ topic, onPress }: TopicCardProps) {
  const score = topic.upvotes - topic.downvotes;
  const replyCount = topic._count?.replies ?? 0;

  const scoreColor =
    score > 0 ? Colors.success : score < 0 ? Colors.danger : Colors.textMuted;
  const scoreBg =
    score > 0
      ? Colors.success + '12'
      : score < 0
        ? Colors.danger + '12'
        : Colors.background;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(topic)}
      activeOpacity={0.7}
    >
      {/* Score badge */}
      <View style={[styles.scoreBadge, { backgroundColor: scoreBg }]}>
        <Ionicons
          name={score >= 0 ? 'arrow-up' : 'arrow-down'}
          size={12}
          color={scoreColor}
        />
        <Text style={[styles.scoreText, { color: scoreColor }]}>
          {Math.abs(score)}
        </Text>
      </View>

      {/* Conteúdo */}
      <View style={styles.content}>
        {/* Badges */}
        {(topic.isPinned || topic.isClosed || topic.isSolved) && (
          <View style={styles.badges}>
            {topic.isPinned && (
              <View style={[styles.badge, styles.badgePinned]}>
                <Ionicons name="pin" size={10} color={Colors.warning} />
                <Text style={[styles.badgeText, { color: Colors.warning }]}>
                  Fixado
                </Text>
              </View>
            )}
            {topic.isSolved && (
              <View style={[styles.badge, styles.badgeSolved]}>
                <Ionicons
                  name="checkmark-circle"
                  size={10}
                  color={Colors.success}
                />
                <Text style={[styles.badgeText, { color: Colors.success }]}>
                  Resolvido
                </Text>
              </View>
            )}
            {topic.isClosed && (
              <View style={[styles.badge, styles.badgeClosed]}>
                <Ionicons name="lock-closed" size={10} color={Colors.textMuted} />
                <Text style={[styles.badgeText, { color: Colors.textMuted }]}>
                  Fechado
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Título */}
        <Text style={styles.title} numberOfLines={2}>
          {topic.title}
        </Text>

        {/* Preview do conteúdo */}
        <Text style={styles.preview} numberOfLines={2}>
          {topic.content}
        </Text>

        {/* Footer: autor + stats */}
        <View style={styles.footer}>
          {/* Autor */}
          <View style={styles.author}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(topic.author.name)}
              </Text>
            </View>
            <Text style={styles.authorName} numberOfLines={1}>
              {topic.author.name}
            </Text>
            <Text style={styles.dot}>
              {'\u00B7'}
            </Text>
            <Text style={styles.time}>
              {formatRelativeTime(topic.createdAt)}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons name="eye-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.statText}>{topic.views}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons
                name="chatbubble-outline"
                size={12}
                color={Colors.textMuted}
              />
              <Text style={styles.statText}>{replyCount}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  scoreBadge: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.md,
    alignSelf: 'flex-start',
  },
  scoreText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgePinned: {
    backgroundColor: Colors.warning + '15',
  },
  badgeSolved: {
    backgroundColor: Colors.success + '15',
  },
  badgeClosed: {
    backgroundColor: Colors.background,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 4,
    lineHeight: FontSize.md * 1.35,
  },
  preview: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: FontSize.sm * 1.4,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  avatarText: {
    fontSize: 8,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  authorName: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    maxWidth: 80,
  },
  dot: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginHorizontal: 4,
  },
  time: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
