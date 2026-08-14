/**
 * Aulas de uma vitrine do aluno ("Meus Cursos"). Índice do que foi
 * comprado — o play cai no watch normal do curso de origem.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  showcasesService,
  type MyShowcaseDetail,
  type MyShowcaseVideo,
} from '../../../src/services/api/showcases.service';
import { logger } from '../../../src/lib/logger';
import { Colors as colors } from '../../../src/constants/colors';

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ShowcaseLessonsScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [showcase, setShowcase] = useState<MyShowcaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    showcasesService
      .myShowcaseDetail(slug)
      .then(setShowcase)
      .catch((error) => logger.error('[Showcase] Erro ao carregar vitrine:', error))
      .finally(() => setLoading(false));
  }, [slug]);

  const renderItem = ({ item, index }: { item: MyShowcaseVideo; index: number }) => (
    <TouchableOpacity
      style={styles.lessonRow}
      activeOpacity={0.7}
      onPress={() => router.push(`/course/${item.courseId}/watch/${item.id}`)}
    >
      <View style={styles.lessonIndex}>
        <Text style={styles.lessonIndexText}>{String(index + 1).padStart(2, '0')}</Text>
      </View>
      <View style={styles.lessonInfo}>
        <Text style={styles.lessonTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.lessonSubtitle} numberOfLines={1}>
          {item.moduleTitle} · {item.courseTitle}
        </Text>
      </View>
      <Text style={styles.lessonDuration}>{formatTime(item.duration)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {showcase?.title ?? 'Meu curso'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : !showcase ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-off-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Curso não encontrado</Text>
          <Text style={styles.emptyText}>Este conteúdo não está disponível na sua conta.</Text>
        </View>
      ) : (
        <FlatList
          data={showcase.videos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            showcase.description ? (
              <Text style={styles.description}>{showcase.description}</Text>
            ) : null
          }
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="videocam-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Nenhuma aula disponível</Text>
              <Text style={styles.emptyText}>
                As aulas deste curso ainda estão sendo preparadas.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, gap: 8,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1E293B', textAlign: 'center' },
  description: {
    fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 14,
  },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  lessonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  lessonIndex: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  lessonIndexText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  lessonInfo: { flex: 1, gap: 2 },
  lessonTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  lessonSubtitle: { fontSize: 11.5, color: colors.textMuted },
  lessonDuration: { fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});
