/**
 * CourseCard - Card de curso com multiplas variantes
 *
 * Variantes:
 * - progress: Card horizontal para "Em Progresso" (thumbnail esquerda + info + progresso circular)
 * - carousel: Card vertical para "Meus Cursos" carousel (thumbnail com play overlay)
 * - grid: Card vertical para "Concluidos" grid (thumbnail com heart overlay)
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
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
import { CircularProgress } from '../ui/CircularProgress';

type CardVariant = 'progress' | 'carousel' | 'grid';

interface CourseCardProps {
  course: EnrolledCourse | Course;
  variant?: CardVariant;
  onPress?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function CourseCard({
  course,
  variant = 'progress',
  onPress,
}: CourseCardProps) {
  const isEnrolled = 'enrollment' in course;
  const progress = isEnrolled
    ? ((course as EnrolledCourse).progress.percentage ?? (course as EnrolledCourse).progress.progressPercentage ?? 0)
    : 0;
  const enrolledCourse = isEnrolled ? (course as EnrolledCourse) : null;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/course/${course.id}`);
    }
  };

  const thumbnail =
    course.thumbnailHorizontal || course.thumbnailVertical || course.thumbnailUrl || course.thumbnail;

  const totalVideos = enrolledCourse?.progress.totalVideos || 0;

  // Calcula duracao estimada (ex: ~10 min por video)
  const estimatedMinutes = totalVideos * 10;
  const durationText =
    estimatedMinutes >= 60
      ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}min`
      : `${estimatedMinutes} min`;

  // ============================================
  // VARIANTE: PROGRESS (horizontal)
  // ============================================
  if (variant === 'progress') {
    return (
      <TouchableOpacity
        style={styles.progressContainer}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Thumbnail */}
        <View style={styles.progressImageWrap}>
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={styles.progressImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.progressPlaceholder}>
              <Ionicons
                name="videocam-outline"
                size={28}
                color={Colors.textMuted}
              />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.progressInfo}>
          <Text style={styles.progressCategory} numberOfLines={1}>
            {course.instructor?.name || 'Projeto Cirurgiao'}
          </Text>
          <Text style={styles.progressTitle} numberOfLines={2}>
            {course.title}
          </Text>
          <View style={styles.progressMeta}>
            <Ionicons
              name="time-outline"
              size={13}
              color={Colors.textMuted}
            />
            <Text style={styles.progressMetaText}>
              {durationText} | {totalVideos} aulas
            </Text>
          </View>
        </View>

        {/* Progresso circular */}
        {isEnrolled && (
          <View style={styles.progressCircleWrap}>
            <CircularProgress
              percentage={progress}
              size={44}
              strokeWidth={4}
              color={Colors.accent}
              backgroundColor={Colors.border}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // ============================================
  // VARIANTE: CAROUSEL (vertical com play overlay)
  // ============================================
  if (variant === 'carousel') {
    const cardW = SCREEN_WIDTH * 0.52;
    const cardH = cardW * 0.62;

    return (
      <TouchableOpacity
        style={[styles.carouselContainer, { width: cardW }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Thumbnail com play */}
        <View style={[styles.carouselImageWrap, { height: cardH }]}>
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={styles.carouselImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.carouselPlaceholder}>
              <Ionicons
                name="videocam-outline"
                size={32}
                color={Colors.textMuted}
              />
            </View>
          )}
          {/* Play icon overlay */}
          <View style={styles.playOverlay}>
            <Ionicons name="play-circle" size={36} color={Colors.white} />
          </View>
        </View>

        {/* Info */}
        <View style={styles.carouselInfo}>
          <Text style={styles.carouselCategory} numberOfLines={1}>
            {course.instructor?.name || 'Projeto Cirurgiao'}
          </Text>
          <Text style={styles.carouselTitle} numberOfLines={2}>
            {course.title}
          </Text>
          <View style={styles.carouselMeta}>
            <Ionicons
              name="time-outline"
              size={12}
              color={Colors.textMuted}
            />
            <Text style={styles.carouselMetaText}>
              {durationText} | {totalVideos} aulas
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ============================================
  // VARIANTE: GRID (2 colunas com heart overlay)
  // ============================================
  const gridCardW = (SCREEN_WIDTH - Spacing['2xl'] * 2 - Spacing.md) / 2;
  const gridCardH = gridCardW * 0.65;

  return (
    <TouchableOpacity
      style={[styles.gridContainer, { width: gridCardW }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Thumbnail com heart */}
      <View style={[styles.gridImageWrap, { height: gridCardH }]}>
        {thumbnail ? (
          <Image
            source={{ uri: thumbnail }}
            style={styles.gridImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.gridPlaceholder}>
            <Ionicons
              name="videocam-outline"
              size={28}
              color={Colors.textMuted}
            />
          </View>
        )}
        {/* Heart overlay */}
        <TouchableOpacity style={styles.heartOverlay} activeOpacity={0.7}>
          <Ionicons name="heart-outline" size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.gridInfo}>
        <Text style={styles.gridCategory} numberOfLines={1}>
          {course.instructor?.name || 'Projeto Cirurgiao'}
        </Text>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {course.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ============================================
  // PROGRESS (horizontal)
  // ============================================
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  progressImageWrap: {
    width: 90,
    height: 70,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.border,
  },
  progressImage: {
    width: '100%',
    height: '100%',
  },
  progressPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
  },
  progressInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  progressCategory: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.accent,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  progressTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    lineHeight: FontSize.md * 1.3,
    marginBottom: Spacing.xs,
  },
  progressMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressMetaText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  progressCircleWrap: {
    marginLeft: Spacing.xs,
  },

  // ============================================
  // CAROUSEL (vertical com play)
  // ============================================
  carouselContainer: {
    marginRight: Spacing.md,
  },
  carouselImageWrap: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.border,
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  carouselInfo: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  carouselCategory: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.accent,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  carouselTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    lineHeight: FontSize.sm * 1.35,
    marginBottom: Spacing.xs,
  },
  carouselMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  carouselMetaText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },

  // ============================================
  // GRID (2 colunas com heart)
  // ============================================
  gridContainer: {
    marginBottom: Spacing.lg,
  },
  gridImageWrap: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.border,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
  },
  heartOverlay: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridInfo: {
    paddingTop: Spacing.sm,
  },
  gridCategory: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.accent,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  gridTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    lineHeight: FontSize.sm * 1.35,
  },
});

export default CourseCard;
