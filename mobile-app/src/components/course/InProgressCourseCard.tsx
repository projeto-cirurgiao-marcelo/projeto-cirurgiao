import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as colors } from '../../constants/colors';
import type { EnrolledCourse } from '../../types/student.types';

interface InProgressCourseCardProps {
  course: EnrolledCourse;
  lastWatchedTitle?: string;
  onPress: () => void;
  onResume: () => void;
}

export function InProgressCourseCard({
  course,
  lastWatchedTitle,
  onPress,
  onResume,
}: InProgressCourseCardProps) {
  const progress = course.progress?.percentage
    ?? course.progress?.progressPercentage
    ?? course.enrollment?.progress
    ?? 0;
  const watched = course.progress?.watchedVideos ?? course.progress?.completedVideos ?? 0;
  const total = course.progress?.totalVideos ?? 0;
  const thumbnail = course.thumbnailHorizontal || course.thumbnail || course.thumbnailUrl;
  const isAlmostDone = progress >= 75;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Thumbnail */}
      <View style={styles.thumbContainer}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="videocam-outline" size={24} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.progressBadge}>
          <Text style={styles.progressBadgeText}>{Math.round(progress)}%</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{course.title}</Text>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(progress, 100)}%` },
              isAlmostDone && styles.progressFillGreen,
            ]}
          />
        </View>

        <Text style={styles.stats}>{watched}/{total} aulas</Text>

        {/* Last watched */}
        {lastWatchedTitle && (
          <View style={styles.lastWatched}>
            <Ionicons name="play-circle" size={12} color={colors.accent} />
            <Text style={styles.lastWatchedText} numberOfLines={1}>
              {lastWatchedTitle}
            </Text>
          </View>
        )}
      </View>

      {/* Resume button */}
      <TouchableOpacity style={styles.resumeButton} onPress={onResume} activeOpacity={0.8}>
        <Ionicons name="play" size={16} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  thumbContainer: {
    position: 'relative',
  },
  thumb: {
    width: 100,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  thumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  progressBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 18,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  progressFillGreen: {
    backgroundColor: colors.success,
  },
  stats: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  lastWatched: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.accent}0D`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
  },
  lastWatchedText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.accent,
    flex: 1,
  },
  resumeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
