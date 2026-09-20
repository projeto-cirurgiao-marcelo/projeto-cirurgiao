/**
 * Registro de vidas salvas (direção C): "Nº 0128" e um livro de registro,
 * uma linha por vida (nº, data, espécie, procedimento). Privado conta, fica
 * em itálico e não abre. FAB "Registrar".
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '../../src/constants/colors';
import { livesSavedService, SPECIES_LABEL, STATUS_LABEL, type Story, type WallEntry } from '../../src/services/api/lives-saved.service';
import { useLivesSavedStore } from '../../src/stores/lives-saved-store';
import { CountUp, MONO, padSeq } from '../../src/components/lives-saved/LivesSavedBanner';
import { compactDate } from '../../src/lib/lives-saved-format';

const PAGE = 30;
const WEEK = 7 * 86_400_000;

export default function LivesSavedScreen() {
  const summary = useLivesSavedStore((s) => s.summary);
  const refreshSummary = useLivesSavedStore((s) => s.refresh);
  const [entries, setEntries] = useState<WallEntry[]>([]);
  const [mine, setMine] = useState<Story[]>([]);
  const [shown, setShown] = useState(PAGE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [wall, own] = await Promise.all([livesSavedService.wall(), livesSavedService.mine(), refreshSummary()]);
    setEntries(wall?.entries ?? []);
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

  const total = summary?.total ?? entries.length;
  const pendingMine = mine.filter((m) => m.status !== 'APPROVED');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} accessibilityRole="button" accessibilityLabel="Voltar" style={styles.headerButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registro de vidas salvas</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <View style={styles.numRow}>
          <Text style={styles.numLabel}>Nº</Text>
          <Text style={styles.num}><CountUp value={total} pad={4} /></Text>
          <Text style={styles.numUnit}>
            relatos aprovados{!!summary?.newThisWeek && <Text style={styles.fresh}> · +{summary.newThisWeek} esta semana</Text>}
          </Text>
        </View>

        {pendingMine.length > 0 && (
          <View style={styles.mineBox}>
            <Text style={styles.mineTitle}>Meus relatos em andamento</Text>
            {pendingMine.map((s) => (
              <TouchableOpacity key={s.id} style={styles.mineRow} onPress={() => router.push(`/lives-saved/edit/${s.id}`)}>
                <Text style={[styles.chip, s.status === 'REJECTED' && styles.chipWarn]}>{STATUS_LABEL[s.status]}</Text>
                <Text style={styles.mineText} numberOfLines={1}>{s.attribution ? s.excerpt : 'Sem texto ainda'}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.ledger}>
          <View style={[styles.row, styles.rowHead]}>
            <Text style={[styles.idx, styles.headText]}>nº</Text>
            <Text style={[styles.dt, styles.headText]}>data</Text>
            <Text style={[styles.proc, styles.headText]}>procedimento</Text>
          </View>
          {loading ? (
            <ActivityIndicator style={{ margin: Spacing.xl }} color={Colors.accent} />
          ) : entries.length === 0 ? (
            <Text style={styles.empty}>O registro ainda está vazio. A primeira linha pode ser a sua.</Text>
          ) : (
            entries.slice(0, shown).map((e) => {
              const openable = e.isPublic || e.isMine;
              const fresh = e.approvedAt && Date.now() - new Date(e.approvedAt).getTime() < WEEK;
              return (
                <TouchableOpacity key={e.id} style={styles.row} disabled={!openable} onPress={() => router.push(`/lives-saved/${e.id}`)} activeOpacity={0.7}>
                  <Text style={[styles.idx, fresh && { color: Colors.warning }]}>{padSeq(e.seq)}</Text>
                  <Text style={styles.dt}>{compactDate(e.occurredAt ?? e.approvedAt)}</Text>
                  <View style={styles.proc}>
                    {openable ? (
                      <Text style={styles.procText} numberOfLines={2}>
                        {e.procedureSummary || 'Ver relato'}{e.isMine ? <Text style={styles.meu}>  meu</Text> : null}
                      </Text>
                    ) : (
                      <Text style={styles.priv}>relato privado · conta, não abre</Text>
                    )}
                    <Text style={styles.sub} numberOfLines={1}>
                      {[e.species ? SPECIES_LABEL[e.species] : null, e.reporterDisplay].filter(Boolean).join(' · ') || (openable ? 'Médico(a) veterinário(a)' : '')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          {entries.length > shown && (
            <TouchableOpacity onPress={() => setShown((n) => n + PAGE)} style={styles.more}>
              <Text style={styles.moreText}>ver as {entries.length - shown} anteriores ›</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ height: 96 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={startReport} disabled={creating} accessibilityRole="button" accessibilityLabel="Registrar uma vida salva">
        {creating ? <ActivityIndicator color={Colors.white} /> : <Ionicons name="add" size={20} color={Colors.white} />}
        <Text style={styles.fabText}>Registrar</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text },
  content: { padding: Spacing['2xl'], paddingBottom: 0 },
  numRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm, marginBottom: Spacing.xl, flexWrap: 'wrap' },
  numLabel: { fontFamily: MONO, fontSize: FontSize.sm, letterSpacing: 1.5, color: Colors.textSecondary },
  num: { fontFamily: MONO, fontSize: 44, fontWeight: FontWeight.semibold, lineHeight: 48, color: Colors.primary, fontVariant: ['tabular-nums'] },
  numUnit: { fontSize: FontSize.sm, color: Colors.textSecondary },
  fresh: { color: Colors.warning, fontWeight: FontWeight.medium },
  mineBox: { backgroundColor: Colors.warningLight, borderWidth: 1, borderColor: Colors.warning, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.xl, gap: Spacing.sm },
  mineTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  mineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  mineText: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  chip: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.accentDark, backgroundColor: Colors.accentSoft, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full, overflow: 'hidden' },
  chipWarn: { color: Colors.warning, backgroundColor: Colors.card },
  ledger: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowHead: { borderBottomColor: Colors.textMuted, paddingVertical: Spacing.sm },
  headText: { fontSize: FontSize.xs, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, fontFamily: undefined },
  idx: { width: 40, fontFamily: MONO, fontSize: FontSize.xs, color: Colors.textMuted, paddingTop: 2 },
  dt: { width: 76, fontFamily: MONO, fontSize: FontSize.xs, color: Colors.textSecondary, paddingTop: 2 },
  proc: { flex: 1, gap: 2 },
  procText: { fontSize: FontSize.md, color: Colors.text, lineHeight: FontSize.md * 1.4 },
  priv: { fontSize: FontSize.sm, color: Colors.textMuted, fontStyle: 'italic' },
  sub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  meu: { color: Colors.accent, fontWeight: FontWeight.semibold, fontSize: FontSize.xs },
  more: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  moreText: { color: Colors.accent, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  empty: { fontSize: FontSize.md, color: Colors.textSecondary, padding: Spacing.lg },
  fab: { position: 'absolute', right: Spacing['2xl'], bottom: Spacing['3xl'], flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.accent, borderRadius: BorderRadius.full, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, ...Shadows.lg },
  fabText: { color: Colors.white, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
});
