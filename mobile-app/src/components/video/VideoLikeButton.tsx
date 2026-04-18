import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { likesService, LikeStatus } from '../../services/api/likes.service';
import { logger } from '../../lib/logger';
import { Colors as colors } from '../../constants/colors';

interface VideoLikeButtonProps {
  videoId: string;
}

function formatCount(count: number | undefined | null): string {
  const safeCount = typeof count === 'number' && !isNaN(count) ? count : 0;
  if (safeCount >= 1000000) {
    return `${(safeCount / 1000000).toFixed(1)}M`;
  }
  if (safeCount >= 1000) {
    return `${(safeCount / 1000).toFixed(1)}K`;
  }
  return safeCount.toString();
}

export function VideoLikeButton({ videoId }: VideoLikeButtonProps) {
  const [status, setStatus] = useState<LikeStatus>({ liked: false, likesCount: 0 });
  const [loading, setLoading] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadLikeStatus();
  }, [videoId]);

  const loadLikeStatus = async () => {
    try {
      const data = await likesService.getStatus(videoId);
      // Garantir dados válidos
      setStatus({
        liked: Boolean(data?.liked),
        likesCount: typeof data?.likesCount === 'number' ? data.likesCount : 0,
      });
    } catch (error) {
      logger.error('Erro ao carregar status de like:', error);
      // Manter valor padrão em caso de erro
      setStatus({ liked: false, likesCount: 0 });
    }
  };

  const handleToggle = async () => {
    if (loading) return;

    // Optimistic update
    const previousStatus = { ...status };
    setStatus({
      liked: !status.liked,
      likesCount: status.liked ? status.likesCount - 1 : status.likesCount + 1,
    });

    // Animate bounce
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      setLoading(true);
      const newStatus = await likesService.toggle(videoId);
      setStatus(newStatus);
    } catch (error) {
      logger.error('Erro ao alternar like:', error);
      // Rollback on error
      setStatus(previousStatus);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleToggle}
      disabled={loading}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons
          name={status.liked ? 'heart' : 'heart-outline'}
          size={18}
          color={status.liked ? '#ef4444' : colors.text}
        />
      </Animated.View>
      <Text style={[styles.count, status.liked && styles.countLiked]}>
        {formatCount(status.likesCount)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  countLiked: {
    color: '#ef4444',
  },
});

export default VideoLikeButton;
