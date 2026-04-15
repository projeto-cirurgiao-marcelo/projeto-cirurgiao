import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as colors } from '../../constants/colors';
import type { Course } from '../../types/course.types';
import type { EnrolledCourse } from '../../types/student.types';

type AnyCourse = Course | EnrolledCourse;

function isEnrolled(course: AnyCourse): course is EnrolledCourse {
  return 'enrollment' in course;
}

function getProgress(course: AnyCourse): number {
  if (!isEnrolled(course)) return -1;
  return course.progress?.percentage
    ?? course.progress?.progressPercentage
    ?? course.enrollment?.progress
    ?? 0;
}

function estimateDuration(course: AnyCourse): string {
  let totalVideos = 0;
  if (course.modules) {
    for (const m of course.modules) {
      totalVideos += m.videos?.length ?? m._count?.videos ?? 0;
    }
  }
  if (totalVideos === 0) totalVideos = isEnrolled(course) ? course.progress?.totalVideos ?? 0 : 0;
  const hours = Math.floor((totalVideos * 10) / 60);
  const mins = (totalVideos * 10) % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

interface CatalogCourseCardProps {
  course: AnyCourse;
  onPress: () => void;
}

export function CatalogCourseCard({ course, onPress }: CatalogCourseCardProps) {
  const enrolled = isEnrolled(course);
  const progress = getProgress(course);
  const thumbnail = course.thumbnailHorizontal || course.thumbnail || course.thumbnailUrl;
  const duration = estimateDuration(course);
  const moduleCount = course._count?.modules ?? course.modules?.length ?? 0;
  const studentCount = course._count?.enrollments ?? 0;
  const instructorName = course.instructor?.name;

  let totalVideos = 0;
  if (enrolled) {
    totalVideos = course.progress?.totalVideos ?? 0;
  } else if (course.modules) {
    for (const m of course.modules) {
      totalVideos += m.videos?.length ?? m._count?.videos ?? 0;
    }
  }

  // Status badge
  let statusLabel = '';
  let statusColor = '';
  let statusIcon: keyof typeof Ionicons.glyphMap = 'bookmark';
  if (enrolled) {
    if (progress >= 100) {
      statusLabel = 'Concluido';
      statusColor = 'rgba(34,197,94,0.9)';
      statusIcon = 'checkmark-circle';
    } else if (progress > 0) {
      statusLabel = 'Em Andamento';
      statusColor = 'rgba(74,108,247,0.9)';
      statusIcon = 'play-circle';
    } else {
      statusLabel = 'Matriculado';
      statusColor = 'rgba(245,158,11,0.9)';
      statusIcon = 'bookmark';
    }
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Thumbnail */}
      <View style={styles.thumbContainer}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="school-outline" size={36} color="#9CA3AF" />
          </View>
        )}

        {/* Status badge (top-left) */}
        {enrolled && statusLabel && (
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Ionicons name={statusIcon} size={11} color="#fff" />
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        )}

        {/* Duration (bottom-left) */}
        {duration && (
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={11} color="#fff" />
            <Text style={styles.durationText}>{duration}</Text>
          </View>
        )}

        {/* Progress % (bottom-right) */}
        {enrolled && progress > 0 && progress < 100 && (
          <View style={styles.progressPercentBadge}>
            <Text style={styles.progressPercentText}>{Math.round(progress)}%</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.infoSection}>
        {/* Top row: instructor + students */}
        <View style={styles.topRow}>
          {instructorName && (
            <View style={styles.instructorTag}>
              <Text style={styles.instructorText}>{instructorName}</Text>
            </View>
          )}
          {studentCount > 0 && (
            <View style={styles.studentRow}>
              <Ionicons name="people-outline" size={12} color="#94A3B8" />
              <Text style={styles.studentText}>{studentCount} alunos</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>{course.title}</Text>

        {/* Description (only for non-enrolled) */}
        {!enrolled && course.description && (
          <Text style={styles.description} numberOfLines={2}>{course.description}</Text>
        )}

        {/* Meta row */}
        <View style={styles.metaRow}>
          <Ionicons name="star" size={13} color="#F59E0B" />
          <Text style={styles.metaRating}>4.8</Text>
          <Text style={styles.metaDot}>·</Text>
          <Ionicons name="folder-outline" size={13} color="#94A3B8" />
          <Text style={styles.metaText}>{moduleCount} modulos</Text>
          <Text style={styles.metaDot}>·</Text>
          <Ionicons name="videocam-outline" size={13} color="#94A3B8" />
          <Text style={styles.metaText}>{totalVideos} aulas</Text>
        </View>

        {/* Progress bar (enrolled with progress) */}
        {enrolled && progress > 0 && progress < 100 && (
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Seu progresso</Text>
              <Text style={styles.progressValue}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  thumbContainer: {
    width: '100%',
    height: 160,
    backgroundColor: '#F1F5F9',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#fff',
  },
  progressPercentBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  infoSection: {
    padding: 12,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instructorTag: {
    backgroundColor: `${colors.accent}0F`,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  instructorText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.accent,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  studentText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 21,
  },
  description: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaRating: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  metaDot: {
    fontSize: 11,
    color: '#94A3B8',
    marginHorizontal: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  progressSection: {
    marginTop: 4,
    gap: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
});
