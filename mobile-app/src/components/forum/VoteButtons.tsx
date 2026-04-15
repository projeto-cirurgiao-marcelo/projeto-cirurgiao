/**
 * Botões de voto (upvote/downvote) para tópicos e respostas
 * Suporta otimistic UI updates
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { forumService } from '../../services/api/forum.service';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../constants/colors';

interface VoteButtonsProps {
  type: 'topic' | 'reply';
  id: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
  /** Voto atual do usuário: 1, -1 ou null */
  userVote?: number | null;
  /** Layout: 'horizontal' (padrão) ou 'vertical' */
  layout?: 'horizontal' | 'vertical';
  onVoteChange?: () => void;
}

export default function VoteButtons({
  type,
  id,
  initialUpvotes = 0,
  initialDownvotes = 0,
  userVote: initialUserVote = null,
  layout = 'horizontal',
  onVoteChange,
}: VoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [currentVote, setCurrentVote] = useState<number | null>(initialUserVote);
  const [isVoting, setIsVoting] = useState(false);

  const score = upvotes - downvotes;

  const handleVote = async (value: 1 | -1) => {
    if (isVoting) return;

    // Salvar estado anterior para rollback
    const prevUpvotes = upvotes;
    const prevDownvotes = downvotes;
    const prevVote = currentVote;

    // Determinar novo estado
    const newVote = currentVote === value ? null : value;

    // Otimistic update
    if (currentVote === value) {
      // Remove voto
      if (value === 1) setUpvotes((v) => v - 1);
      else setDownvotes((v) => v - 1);
    } else {
      // Adiciona/troca voto
      if (currentVote === 1) setUpvotes((v) => v - 1);
      if (currentVote === -1) setDownvotes((v) => v - 1);
      if (value === 1) setUpvotes((v) => v + 1);
      else setDownvotes((v) => v + 1);
    }
    setCurrentVote(newVote);

    setIsVoting(true);
    try {
      if (type === 'topic') {
        await forumService.voteOnTopic({ topicId: id, value });
      } else {
        await forumService.voteOnReply({ replyId: id, value });
      }
      onVoteChange?.();
    } catch {
      // Rollback
      setUpvotes(prevUpvotes);
      setDownvotes(prevDownvotes);
      setCurrentVote(prevVote);
      Alert.alert('Erro', 'Não foi possível registrar seu voto.');
    } finally {
      setIsVoting(false);
    }
  };

  const scoreColor =
    score > 0 ? Colors.success : score < 0 ? Colors.danger : Colors.textMuted;

  const isVertical = layout === 'vertical';

  return (
    <View style={[styles.container, isVertical && styles.containerVertical]}>
      <TouchableOpacity
        style={[
          styles.voteButton,
          currentVote === 1 && styles.voteButtonActive,
        ]}
        onPress={() => handleVote(1)}
        disabled={isVoting}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={currentVote === 1 ? 'arrow-up' : 'arrow-up-outline'}
          size={16}
          color={currentVote === 1 ? Colors.success : Colors.textMuted}
        />
      </TouchableOpacity>

      <Text style={[styles.score, { color: scoreColor }]}>{score}</Text>

      <TouchableOpacity
        style={[
          styles.voteButton,
          currentVote === -1 && styles.voteButtonActiveDown,
        ]}
        onPress={() => handleVote(-1)}
        disabled={isVoting}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={currentVote === -1 ? 'arrow-down' : 'arrow-down-outline'}
          size={16}
          color={currentVote === -1 ? Colors.danger : Colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  containerVertical: {
    flexDirection: 'column',
  },
  voteButton: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voteButtonActive: {
    backgroundColor: Colors.success + '15',
  },
  voteButtonActiveDown: {
    backgroundColor: Colors.danger + '15',
  },
  score: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    minWidth: 20,
    textAlign: 'center',
  },
});
