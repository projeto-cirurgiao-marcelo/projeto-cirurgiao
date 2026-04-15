import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as colors } from '../../constants/colors';
import { VideoLikeButton } from './VideoLikeButton';
import { progressService } from '../../services/api/progress.service';

interface VideoActionBarProps {
  videoId: string;
  isCompleted: boolean;
  onCompletedChange?: (completed: boolean) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export function VideoActionBar({
  videoId,
  isCompleted,
  onCompletedChange,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: VideoActionBarProps) {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(isCompleted);

  // Sincronizar com a prop quando o pai atualiza (ex: auto-complete ao assistir 95%)
  useEffect(() => {
    if (isCompleted && !completed) {
      setCompleted(true);
    }
  }, [isCompleted]);

  const handleToggleComplete = async () => {
    if (loading) return;

    try {
      setLoading(true);

      if (completed) {
        await progressService.markAsIncomplete(videoId);
        setCompleted(false);
        onCompletedChange?.(false);
      } else {
        await progressService.markAsCompleted(videoId);
        setCompleted(true);
        onCompletedChange?.(true);
      }
    } catch (error) {
      console.error('Erro ao alterar status de conclusão:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Navegação Anterior */}
      <TouchableOpacity
        style={[styles.navButton, !hasPrevious && styles.navButtonDisabled]}
        onPress={onPrevious}
        disabled={!hasPrevious}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name="chevron-back"
          size={16}
          color={hasPrevious ? colors.text : colors.textMuted}
        />
        <Text style={[styles.navText, !hasPrevious && styles.navTextDisabled]}>
          Anterior
        </Text>
      </TouchableOpacity>

      {/* Ações Centrais */}
      <View style={styles.centerActions}>
        <VideoLikeButton videoId={videoId} />

        <TouchableOpacity
          style={[styles.completeButton, completed && styles.completeButtonActive]}
          onPress={handleToggleComplete}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={completed ? '#fff' : colors.accent} />
          ) : (
            <>
              <Ionicons
                name={completed ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={16}
                color={completed ? '#fff' : colors.accent}
              />
              <Text style={[styles.completeText, completed && styles.completeTextActive]}>
                {completed ? 'Concluído' : 'Concluir'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Navegação Próxima */}
      <TouchableOpacity
        style={[styles.navButton, !hasNext && styles.navButtonDisabled]}
        onPress={onNext}
        disabled={!hasNext}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.navText, !hasNext && styles.navTextDisabled]}>
          Próxima
        </Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={hasNext ? colors.text : colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    gap: 2,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  navTextDisabled: {
    color: colors.textMuted,
  },
  centerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accent,
    gap: 4,
  },
  completeButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  completeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  completeTextActive: {
    color: '#fff',
  },
});

export default VideoActionBar;
