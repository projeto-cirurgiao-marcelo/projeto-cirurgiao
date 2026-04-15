/**
 * CourseCardHome - Card full-width para a Home Screen
 *
 * Layout:
 * - Thumbnail full-width com badges de duração e progresso
 * - Tag de categoria (instructor)
 * - Título do curso
 * - Rating + contagem de alunos
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/colors';
import { EnrolledCourse, Course } from '../../types';

interface CourseCardHomeProps {
  course: EnrolledCourse | Course;
  onPress?: () => void;
}

export function CourseCardHome({ course, onPress }: CourseCardHomeProps) {
  const isEnrolled = 'enrollment' in course;
  const enrolledCourse = isEnrolled ? (course as EnrolledCourse) : null;
  const progress = enrolledCourse?.progress.percentage ?? 0;
  const totalVideos = enrolledCourse?.progress.totalVideos ?? 0;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/course/${course.id}`);
    }
  };

  const thumbnail =
    course.thumbnailHorizontal || course.thumbnailVertical || course.thumbnailUrl || course.thumbnail;

  // Duração estimada (~10 min por vídeo)
  const estimatedMinutes = totalVideos * 10;
  const durationText =
    estimatedMinutes >= 60
      ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}min`
      : estimatedMinutes > 0
        ? `${estimatedMinutes} min`
        : null;

  const instructorName = course.instructor?.name || 'Projeto Cirurgião';
  const enrollmentCount = course._count?.enrollments ?? 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Thumbnail com badges */}
      <View style={styles.imageWrap}>
        {thumbnail ? (
          <Image
            source={{ uri: thumbnail }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons
              name="videocam-outline"
              size={36}
              color={Colors.textMuted}
            />
          </View>
        )}

        {/* Badge duração - canto inferior esquerdo */}
        {durationText && (
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={11} color={Colors.white} />
            <Text style={styles.durationText}>{durationText}</Text>
          </View>
        )}

        {/* Badge progresso - canto inferior direito (só se enrolled) */}
        {isEnrolled && progress > 0 && (
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}
      </View>

      {/* Info section */}
      <View style={styles.info}>
        {/* Tag categoria */}
        <View style={styles.tagContainer}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{instructorName}</Text>
          </View>
        </View>

        {/* Título */}
        <Text style={styles.title} numberOfLines={2}>
          {course.title}
        </Text>

        {/* Rating + alunos */}
        <View style={styles.metaRow}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={13} color={Colors.warning} />
            <Text style={styles.ratingText}>4.8</Text>
          </View>
          {enrollmentCount > 0 && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <View style={styles.studentsContainer}>
                <Ionicons
                  name="people-outline"
                  size={13}
                  color={Colors.textMuted}
                />
                <Text style={styles.studentsText}>
                  {enrollmentCount} aluno{enrollmentCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </>
          )}
          {totalVideos > 0 && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.lessonsText}>
                {totalVideos} aula{totalVideos !== 1 ? 's' : ''}
              </Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  imageWrap: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.border,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
  },

  // Badge duração
  durationBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  durationText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.white,
  },

  // Badge progresso
  progressBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  progressText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },

  // Info
  info: {
    padding: Spacing.md,
  },

  // Tag
  tagContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.accent,
  },

  // Título
  title: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    lineHeight: FontSize.base * 1.3,
    marginBottom: Spacing.sm,
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  metaDot: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginHorizontal: Spacing.sm,
  },
  studentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  studentsText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  lessonsText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});

export default CourseCardHome;
