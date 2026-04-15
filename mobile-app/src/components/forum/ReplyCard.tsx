/**
 * Card de resposta do fórum
 * Exibe autor, conteúdo, timestamp e botões de voto
 */

import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ForumReply } from '../../types';
import VoteButtons from './VoteButtons';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../constants/colors';

interface ReplyCardProps {
  reply: ForumReply;
  currentUserId?: string;
  onDelete?: (replyId: string) => void;
  onVoteChange?: () => void;
}

/** Formata data relativa */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHour < 24) return `${diffHour}h atrás`;
  if (diffDay < 7) return `${diffDay}d atrás`;
  if (diffWeek < 4) return `${diffWeek}sem atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function ReplyCard({
  reply,
  currentUserId,
  onDelete,
  onVoteChange,
}: ReplyCardProps) {
  const isAuthor = currentUserId === reply.authorId;

  const handleDelete = () => {
    Alert.alert(
      'Excluir resposta',
      'Tem certeza que deseja excluir esta resposta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => onDelete?.(reply.id),
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* Header: avatar + nome + tempo */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(reply.author.name)}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.authorName}>{reply.author.name}</Text>
          <Text style={styles.time}>
            {formatRelativeTime(reply.createdAt)}
          </Text>
        </View>

        {/* Ações do autor */}
        {isAuthor && onDelete && (
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      {/* Conteúdo */}
      <Text style={styles.content}>{reply.content}</Text>

      {/* Votos */}
      <View style={styles.footer}>
        <VoteButtons
          type="reply"
          id={reply.id}
          onVoteChange={onVoteChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  avatarText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  headerInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  time: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  content: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: FontSize.md * 1.55,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
