/**
 * Vidas salvas: número grande, mural em miniatura (um ponto por vida),
 * relatos recentes e FAB "Relatar". Só logados chegam aqui (Stack.Protected).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '../../src/constants/colors';
import {
  livesSavedService,
  SPECIES_LABEL,
  STATUS_LABEL,
  type Story,
  type StoryCard,
  type WallDot,
} from '../../src/services/api/lives-saved.service';
import { useLivesSavedStore } from '../../src/stores/lives-saved-store';
import { CountUp } from '../../src/components/lives-saved/LivesSavedBanner';
import { compactDate } from '../../src/lib/lives-saved-format';

const WEEK = 7 * 86_400_000;

export default function LivesSavedScreen() {
  const summary = useLivesSavedStore((s) => s.summary);
  const refreshSummary = useLivesSavedStore((s) => s.refresh);
  const [dots, setDots] = useState<WallDot[]>([]);
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [mine, setMine] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [wall, recent, own] = await Promise.all([
      livesSavedService.wall(),
      livesSavedService.stories(undefined, 10),
      livesSavedService.mine(),
      refreshSummary(),
    ]);
    setDots(wall?.dots ?? []);
    setStories(recent.items);
    setMine(own);
    setLoading(false);
    setRefreshing(false);
  }, [refreshSummary]);

  useEffect(() => {
    load();
  }, [load]);

  async function startReport() {
    setCreating(true);
    try {
      const draft = await livesSavedService.createDraft();
      router.push(`/lives-saved/edit/${draft.id}`);
    } catch {
      Alert.alert('Não foi possível iniciar', 'Tente novamente em instantes.');
    } finally {
      setCreating(false);
    }
  }

  const total = summary?.total ?? dots.length;
  const pendingMine = mine.filter((m) => m.status !== 'APPROVED');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vidas salvas</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View style={styles.bigCard}>
          <Text style={styles.bigValue}>
            <CountUp value={total} />
          </Text>
          <Text style={styles.bigLabel}>relatos aprovados · toque num ponto azul</Text>
          {!!summary?.newThisWeek && (
            <Text style={styles.fresh}>{summary.newThisWeek} nova{summary.newThisWeek > 1 ? 's' : ''} esta semana</Text>
          )}
          {loading ? (
            <ActivityIndicator style={{ marginTop: Spacing.md }} color={Colors.accent} />
          ) : (
            <View style={styles.dots}>
              {dots.map((d) => {
                const fresh = d.approvedAt && Date.now() - new Date(d.approvedAt).getTime() < WEEK;
                const openable = d.isPublic || d.isMine;
                return (
                  <TouchableOpacity
                    key={d.id}
                    disabled={!openable}
                    onPress={() => router.push(`/lives-saved/${d.id}`)}
                    accessibilityLabel={openable ? `${d.species ? SPECIES_LABEL[d.species] : 'Relato'}, ${compactDate(d.approvedAt)}` : 'Relato privado'}
                    style={[
                      styles.dot,
                      openable && styles.dotPublic,
                      openable && fresh && styles.dotFresh,
                      d.isMine && styles.dotMine,
                    ]}
                  />
                );
              })}
            </View>
          )}
        </View>

        {pendingMine.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Meus relatos</Text>
            {pendingMine.map((s) => (
              <TouchableOpacity key={s.id} style={styles.card} onPress={() => router.push(`/lives-saved/edit/${s.id}`)}>
                <View style={styles.cardMeta}>
                  <Text style={[styles.chip, s.status === 'REJECTED' && styles.chipWarn]}>{STATUS_LABEL[s.status]}</Text>
                  <Text style={styles.metaText}>{compactDate(s.updatedAt)}</Text>
                </View>
                <Text style={styles.cardQuote} numberOfLines={2}>
                  {s.attribution ? `“${s.excerpt}”` : 'Sem texto ainda'}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Relatos recentes</Text>
        {!loading && stories.length === 0 ? (
          <Text style={styles.empty}>Ainda não há histórias públicas. Os relatos contam no número mesmo sem serem exibidos.</Text>
        ) : (
          stories.map((s) => (
            <TouchableOpacity key={s.id} style={styles.card} onPress={() => router.push(`/lives-saved/${s.id}`)}>
              <View style={styles.cardMeta}>
                {s.species && <Text style={styles.chip}>{SPECIES_LABEL[s.species]}</Text>}
                <Text style={styles.metaText}>{compactDate(s.occurredAt ?? s.approvedAt)}</Text>
                {s.isMine && <Text style={[styles.metaText, { color: Colors.accent }]}>meu</Text>}
              </View>
              <Text style={styles.cardQuote} numberOfLines={3}>“{s.excerpt}”</Text>
              <Text style={styles.cardWho}>
                <Text style={{ color: Colors.text, fontWeight: FontWeight.semibold }}>{s.reporterDisplay}</Text>
                {s.reporterCrmv ? ` · ${s.reporterCrmv}` : ''}
              </Text>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 96 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={startReport} disabled={creating} accessibilityRole="button" accessibilityLabel="Relatar uma vida salva">
        {creating ? <ActivityIndicator color={Colors.white} /> : <Ionicons name="add" size={20} color={Colors.white} />}
        <Text style={styles.fabText}>Relatar</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text },
  content: { padding: Spacing['2xl'], paddingBottom: 0 },
  bigCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  bigValue: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    lineHeight: FontSize['4xl'] * 1.2,
    fontVariant: ['tabular-nums'],
  },
  bigLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  fresh: { fontSize: FontSize.sm, color: Colors.warning, fontWeight: FontWeight.medium, marginTop: Spacing.xs },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: Spacing.md },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.border },
  dotPublic: { backgroundColor: Colors.accent },
  dotFresh: { backgroundColor: Colors.warning },
  dotMine: { borderWidth: 2, borderColor: Colors.accentDark },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.md },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  chip: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.accentDark,
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  chipWarn: { color: Colors.warning, backgroundColor: Colors.warningLight },
  metaText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  cardQuote: { fontSize: FontSize.md, lineHeight: FontSize.md * 1.5, color: Colors.text },
  cardWho: { fontSize: FontSize.sm, color: Colors.textSecondary },
  empty: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  fab: {
    position: 'absolute',
    right: Spacing['2xl'],
    bottom: Spacing['3xl'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    ...Shadows.lg,
  },
  fabText: { color: Colors.white, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
});
