import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: Colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Skeleton de um card de curso (Home) */
export function CourseCardSkeleton() {
  return (
    <View style={skeletonStyles.courseCard}>
      <Skeleton width="100%" height={140} borderRadius={10} />
      <View style={skeletonStyles.courseCardBody}>
        <Skeleton width="80%" height={14} />
        <Skeleton width="60%" height={12} style={{ marginTop: 8 }} />
        <Skeleton width="40%" height={10} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

/** Skeleton de um ProgressCard horizontal (Home - Em Andamento) */
export function ProgressCardSkeleton() {
  return (
    <View style={skeletonStyles.progressCard}>
      <Skeleton width={220} height={130} borderRadius={10} />
      <View style={skeletonStyles.progressCardBody}>
        <Skeleton width="75%" height={12} />
        <Skeleton width="100%" height={3} style={{ marginTop: 8 }} />
        <Skeleton width="50%" height={10} style={{ marginTop: 6 }} />
        <Skeleton width="100%" height={30} borderRadius={8} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

/** Skeleton de um item de vídeo na listagem do módulo */
export function VideoItemSkeleton() {
  return (
    <View style={skeletonStyles.videoItem}>
      <Skeleton width={32} height={32} borderRadius={16} />
      <View style={skeletonStyles.videoItemContent}>
        <Skeleton width="70%" height={13} />
        <Skeleton width="45%" height={10} style={{ marginTop: 6 }} />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
          <Skeleton width={50} height={10} />
          <Skeleton width={70} height={10} />
        </View>
      </View>
    </View>
  );
}

/** Skeleton para a página de detalhes do curso */
export function CourseDetailSkeleton() {
  return (
    <View style={skeletonStyles.courseDetail}>
      <Skeleton width="100%" height={200} borderRadius={0} />
      <View style={skeletonStyles.courseDetailBody}>
        <Skeleton width="30%" height={12} />
        <Skeleton width="90%" height={18} style={{ marginTop: 10 }} />
        <Skeleton width="60%" height={12} style={{ marginTop: 8 }} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Skeleton width={80} height={24} borderRadius={12} />
          <Skeleton width={80} height={24} borderRadius={12} />
          <Skeleton width={80} height={24} borderRadius={12} />
        </View>
        <Skeleton width="100%" height={44} borderRadius={10} style={{ marginTop: 20 }} />
      </View>
    </View>
  );
}

/** Skeleton para o fórum (lista de categorias) */
export function ForumCategorySkeleton() {
  return (
    <View style={skeletonStyles.forumCategory}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={skeletonStyles.forumCategoryContent}>
        <Skeleton width="65%" height={14} />
        <Skeleton width="90%" height={11} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  courseCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  courseCardBody: {
    padding: 12,
  },
  progressCard: {
    width: 220,
    backgroundColor: Colors.card,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  progressCardBody: {
    padding: 10,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    gap: 12,
  },
  videoItemContent: {
    flex: 1,
  },
  courseDetail: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  courseDetailBody: {
    padding: 16,
  },
  forumCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  forumCategoryContent: {
    flex: 1,
  },
});
