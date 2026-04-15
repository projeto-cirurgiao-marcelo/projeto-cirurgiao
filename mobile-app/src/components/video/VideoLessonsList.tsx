import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Video } from '../../types/course.types';
import { Colors as colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface VideoLessonsListProps {
  videos: Video[];
  currentVideoId: string;
  courseId: string;
}

interface VideoWithStatus extends Video {
  isWatched?: boolean;
  isInProgress?: boolean;
}

export function VideoLessonsList({ videos, currentVideoId, courseId }: VideoLessonsListProps) {
  const router = useRouter();
  const [videosWithStatus, setVideosWithStatus] = useState<VideoWithStatus[]>([]);

  useEffect(() => {
    setVideosWithStatus(videos.map(v => ({
      ...v,
      isWatched: false,
      isInProgress: false,
    })));
  }, [videos]);

  const handlePress = (videoId: string) => {
    if (videoId === currentVideoId) return;
    router.replace(`/course/${courseId}/watch/${videoId}`);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getStatusIcon = (item: VideoWithStatus, isCurrent: boolean) => {
    if (isCurrent) {
      return <Ionicons name="play-circle" size={18} color={colors.accent} />;
    }
    if (item.isWatched) {
      return <Ionicons name="checkmark-circle" size={18} color={colors.success} />;
    }
    if (item.isInProgress) {
      return <Ionicons name="ellipse" size={18} color={colors.warning} />;
    }
    return <Ionicons name="ellipse-outline" size={18} color={colors.border} />;
  };

  const renderItem = ({ item, index }: { item: VideoWithStatus; index: number }) => {
    const isCurrent = item.id === currentVideoId;

    return (
      <TouchableOpacity
        style={[styles.item, isCurrent && styles.currentItem]}
        onPress={() => handlePress(item.id)}
        disabled={isCurrent}
        activeOpacity={0.7}
      >
        <View style={styles.leading}>
          <Text style={[styles.orderNumber, isCurrent && styles.orderNumberCurrent]}>
            {index + 1}
          </Text>
          {getStatusIcon(item, isCurrent)}
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, isCurrent && styles.currentTitle]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.duration}>
            {formatDuration(item.duration || 0)}
          </Text>
        </View>

        {!isCurrent && (
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="videocam-off-outline" size={36} color={colors.textMuted} />
      <Text style={styles.emptyText}>Nenhuma aula neste módulo</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aulas do Módulo</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{videos.length}</Text>
        </View>
      </View>

      <FlatList
        data={videosWithStatus}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.accent + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
  },
  listContent: {
    paddingBottom: 12,
  },
  item: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    alignItems: 'center',
    gap: 10,
  },
  currentItem: {
    backgroundColor: colors.accent + '08',
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 40,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    width: 16,
    textAlign: 'center',
  },
  orderNumberCurrent: {
    color: colors.accent,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 18,
  },
  currentTitle: {
    color: colors.accent,
    fontWeight: '600',
  },
  duration: {
    fontSize: 11,
    color: colors.textMuted,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
