/**
 * Banner do registro de vidas salvas na Home (direção C, 20/09): cartão
 * claro sem gradiente, o único da Home, com "0128" em mono tabular e a
 * última entrada do registro. Tokens de colors.ts.
 */
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '../../constants/colors';
import { useLivesSavedStore } from '../../stores/lives-saved-store';
import { SPECIES_LABEL } from '../../services/api/lives-saved.service';
import { compactDate } from '../../lib/lives-saved-format';

export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
export const padSeq = (n: number | null | undefined) => (n == null ? '—' : String(n).padStart(4, '0'));

export function LivesSavedBanner() {
  const summary = useLivesSavedStore((s) => s.summary);
  const refresh = useLivesSavedStore((s) => s.refresh);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const last = summary?.lastOccurredAt ?? summary?.lastApprovedAt ?? null;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push('/lives-saved')}
      accessibilityRole="button"
      accessibilityLabel="Registro de vidas salvas. Toque para ver"
    >
      <Text style={styles.cap}>Registro de vidas salvas</Text>
      <View style={styles.row}>
        <Text style={styles.value}>
          <CountUp value={summary?.total ?? 0} pad={4} />
        </Text>
        <Text style={styles.unit}>relatos aprovados</Text>
      </View>
      <View style={styles.rule} />
      <View style={styles.foot}>
        <Text style={styles.last} numberOfLines={1}>
          {summary
            ? last
              ? `último · ${compactDate(last)}${summary.lastSpecies ? ` · ${SPECIES_LABEL[summary.lastSpecies].toLowerCase()}` : ''}`
              : 'nenhum relato ainda'
            : 'carregando…'}
        </Text>
        <Text style={styles.link}>
          {summary && summary.newThisWeek > 0 ? `+${summary.newThisWeek} esta semana · ` : ''}ver registro ›
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/** Count-up de 1,2 s com easing; desliga se o sistema pede movimento reduzido. */
export function CountUp({ value, pad }: { value: number; pad?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce || from.current === value) {
        setShown(value);
        from.current = value;
        return;
      }
      const start = from.current;
      const t0 = Date.now();
      const tick = () => {
        const p = Math.min(1, (Date.now() - t0) / 1200);
        const e = 1 - Math.pow(1 - p, 3);
        setShown(Math.round(start + (value - start) * e));
        if (p < 1) raf = requestAnimationFrame(tick);
        else from.current = value;
      };
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [value]);
  return <>{pad ? String(shown).padStart(pad, '0') : shown.toLocaleString('pt-BR')}</>;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing['2xl'],
    marginBottom: Spacing.xl,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  cap: {
    fontSize: FontSize.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm, marginTop: Spacing.xs, marginBottom: Spacing.sm },
  value: {
    fontFamily: MONO,
    fontSize: FontSize['4xl'] + 4,
    fontWeight: FontWeight.semibold,
    lineHeight: (FontSize['4xl'] + 4) * 1.1,
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontSize: FontSize.md, color: Colors.textSecondary },
  rule: { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.sm },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  last: { flex: 1, fontFamily: MONO, fontSize: FontSize.xs, color: Colors.textSecondary },
  link: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: FontWeight.semibold },
});
