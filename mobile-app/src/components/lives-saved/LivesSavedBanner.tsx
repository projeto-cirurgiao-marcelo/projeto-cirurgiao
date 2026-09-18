/**
 * Banner do contador na Home — mesmo molde do banner Mentor IA
 * (gradiente navy, ícone em círculo, título 16/700, subtítulo 12).
 */
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '../../constants/colors';
import { useLivesSavedStore } from '../../stores/lives-saved-store';

export function LivesSavedBanner() {
  const summary = useLivesSavedStore((s) => s.summary);
  const refresh = useLivesSavedStore((s) => s.refresh);
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.85}
      onPress={() => router.push('/lives-saved')}
      accessibilityRole="button"
      accessibilityLabel="Vidas salvas. Toque para ver as histórias"
    >
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="heart" size={26} color={Colors.white} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Vidas salvas</Text>
          <Text style={styles.value}>
            <CountUp value={summary?.total ?? 0} />
          </Text>
          <Text style={styles.subtitle}>
            {summary
              ? summary.newThisWeek > 0
                ? `${summary.newThisWeek} nova${summary.newThisWeek > 1 ? 's' : ''} esta semana · toque para ver`
                : 'relatos de quem aprendeu aqui · toque para ver'
              : 'carregando…'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

/** Count-up de 1,2 s com easing; desliga se o sistema pede movimento reduzido. */
export function CountUp({ value }: { value: number }) {
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
  return <>{shown.toLocaleString('pt-BR')}</>;
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing['2xl'],
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  value: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.bold,
    color: Colors.white,
    lineHeight: FontSize['4xl'] * 1.2,
    fontVariant: ['tabular-nums'],
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
  },
});
