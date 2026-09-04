/**
 * Aulas de uma vitrine. Dois modos:
 * - possuída ("Meus Cursos"): índice do que foi comprado — o play cai no
 *   watch normal do curso de origem.
 * - bloqueada (`?locked=1`, vinda de "Continue evoluindo"): mesmo índice,
 *   com banner de prévia e CTA de checkout. O play abre o watch, onde o gate
 *   do vídeo corta em `previewSeconds` e oferece a vitrine.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  showcasesService,
  type AvailableShowcaseDetail,
  type MyShowcaseDetail,
  type MyShowcaseVideo,
} from '../../../src/services/api/showcases.service';
import { openUnlockHelp } from '../../../src/components/course/LockedShowcaseCard';
import { logger } from '../../../src/lib/logger';
import { Colors as colors } from '../../../src/constants/colors';

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

type ShowcaseDetail = MyShowcaseDetail | AvailableShowcaseDetail;

export default function ShowcaseLessonsScreen() {
  const router = useRouter();
  const { slug, locked: lockedParam } = useLocalSearchParams<{ slug: string; locked?: string }>();
  const locked = lockedParam === '1';
  const [showcase, setShowcase] = useState<ShowcaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const request = locked
      ? showcasesService.availableShowcaseDetail(slug)
      : showcasesService.myShowcaseDetail(slug);
    request
      .then(setShowcase)
      .catch((error) => logger.error('[Showcase] Erro ao carregar vitrine:', error))
      .finally(() => setLoading(false));
  }, [slug, locked]);

  const checkoutUrl =
    locked && showcase && 'checkoutUrl' in showcase ? showcase.checkoutUrl : null;

  const renderItem = ({ item, index }: { item: MyShowcaseVideo; index: number }) => (
    <TouchableOpacity
      style={styles.lessonRow}
      activeOpacity={0.7}
      onPress={() => router.push(`/course/${item.courseId}/watch/${item.id}`)}
    >
      {/* Miniatura da aula (auto-thumbnail do pipeline) com o número como selo;
          sem imagem, placeholder com o número em destaque. */}
      <View style={styles.thumbWrap}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="videocam-outline" size={22} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.indexBadge}>
          <Text style={styles.indexBadgeText}>{String(index + 1).padStart(2, '0')}</Text>
        </View>
        {locked && (
          <View style={styles.thumbLock}>
            <Ionicons name="lock-closed" size={10} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.lessonInfo}>
        <Text style={styles.lessonTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.lessonSubtitle} numberOfLines={1}>
          {item.moduleTitle} · {item.courseTitle}
        </Text>
      </View>
      {locked ? (
        <View style={styles.previewPill}>
          <Text style={styles.previewPillText}>Prévia</Text>
        </View>
      ) : (
        <Text style={styles.lessonDuration}>{formatTime(item.duration)}</Text>
      )}
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      {locked && (
        <View style={styles.lockedBanner}>
          <View style={styles.lockedBannerIcon}>
            <Ionicons name="lock-closed" size={16} color={colors.accent} />
          </View>
          <View style={styles.lockedBannerBody}>
            <Text style={styles.lockedBannerTitle}>Este curso não está disponível na sua conta</Text>
            <Text style={styles.lockedBannerText}>
              Você pode assistir a uma prévia de cada aula para conhecer o conteúdo.
            </Text>
            {checkoutUrl ? (
              // Abre a Central de Ajuda (web) na pergunta de desbloqueio —
              // o app não aponta pro checkout diretamente.
              <TouchableOpacity
                style={styles.unlockButton}
                activeOpacity={0.85}
                onPress={() => slug && openUnlockHelp(slug)}
                accessibilityRole="button"
              >
                <Text style={styles.unlockButtonText}>Saiba mais</Text>
                <Ionicons name="help-circle-outline" size={15} color="#fff" />
              </TouchableOpacity>
            ) : (
              <Text style={styles.soonText}>Este curso ainda não está disponível.</Text>
            )}
          </View>
        </View>
      )}
      {showcase?.description ? (
        <Text style={styles.description}>{showcase.description}</Text>
      ) : null}
    </View>
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
          {showcase?.title ?? (locked ? 'Prévia do curso' : 'Meu curso')}
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
          <Text style={styles.emptyText}>
            {locked
              ? 'Este curso não está disponível no momento.'
              : 'Este conteúdo não está disponível na sua conta.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={showcase.videos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
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

  // ---- Banner de prévia (vitrine bloqueada) ----
  lockedBanner: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: `${colors.accent}33`,
  },
  lockedBannerIcon: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: `${colors.accent}14`,
    justifyContent: 'center', alignItems: 'center',
  },
  lockedBannerBody: { flex: 1, gap: 4 },
  lockedBannerTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  lockedBannerText: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 },
  unlockButton: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    backgroundColor: colors.accent, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9, marginTop: 8,
  },
  unlockButtonText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  soonText: { fontSize: 12, color: colors.textMuted, marginTop: 6 },

  lessonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 10,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  thumbWrap: {
    width: 104, height: 58, borderRadius: 8, overflow: 'hidden',
    backgroundColor: colors.background,
  },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  indexBadge: {
    position: 'absolute', left: 4, bottom: 4,
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
    backgroundColor: 'rgba(3, 20, 43, 0.72)',
  },
  indexBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff', fontVariant: ['tabular-nums'] },
  thumbLock: {
    position: 'absolute', top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center',
  },
  lessonInfo: { flex: 1, gap: 2 },
  lessonTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  lessonSubtitle: { fontSize: 11.5, color: colors.textMuted },
  lessonDuration: { fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  previewPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: `${colors.accent}14`,
  },
  previewPillText: { fontSize: 11, fontWeight: '600', color: colors.accent },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});
