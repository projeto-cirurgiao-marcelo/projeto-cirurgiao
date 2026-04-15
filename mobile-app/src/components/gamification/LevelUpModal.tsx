import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useGamificationStore } from '../../stores/gamification-store';
import { LEVELS } from '../../types/gamification.types';

const PARTICLES = Array.from({ length: 6 }, (_, i) => i);

export function LevelUpModal() {
  const visible = useGamificationStore((s) => s.showLevelUpModal);
  const data = useGamificationStore((s) => s.levelUpData);
  const dismiss = useGamificationStore((s) => s.dismissLevelUp);

  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12, stiffness: 100 });
      rotation.value = withSpring(360, { damping: 20, stiffness: 80 });
    } else {
      scale.value = 0;
      rotation.value = 0;
    }
  }, [visible]);

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${interpolate(rotation.value, [0, 360], [0, 360])}deg` },
    ],
  }));

  if (!visible || !data) return null;

  const isMaxLevel = data.newLevel >= LEVELS.length;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Particles */}
          {PARTICLES.map((i) => (
            <Particle key={i} index={i} color={data.newColor} />
          ))}

          {/* Arrow icon */}
          <View style={[styles.arrowCircle, { backgroundColor: data.newColor + '20' }]}>
            <Ionicons name="arrow-up" size={20} color={data.newColor} />
          </View>

          {/* Level badge */}
          <Animated.View style={[styles.levelBadge, badgeAnimStyle, { backgroundColor: data.newColor }]}>
            <Text style={styles.levelNumber}>{data.newLevel}</Text>
          </Animated.View>

          <Text style={styles.subtitle}>Novo nivel alcancado!</Text>
          <Text style={[styles.title, { color: data.newColor }]}>{data.newTitle}</Text>

          {isMaxLevel && (
            <View style={styles.trophyRow}>
              <Ionicons name="trophy" size={24} color="#FFD700" />
              <Text style={styles.trophyText}>Nivel maximo!</Text>
            </View>
          )}

          <Text style={styles.message}>
            Continue estudando para desbloquear novas conquistas e subir no ranking!
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: data.newColor }]}
            onPress={dismiss}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Particle({ index, color }: { index: number; color: string }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * 200;
    translateY.value = withDelay(
      delay,
      withRepeat(withTiming(-80, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, true),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 1000 }), -1, true),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value * 0.6,
  }));

  const left = 20 + (index * 50) % 260;
  const top = 30 + (index * 30) % 100;

  return (
    <Animated.View style={[styles.particle, style, { left, top }]}>
      <Ionicons name="sparkles" size={12} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    zIndex: 0,
  },
  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  levelNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  trophyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  trophyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
  },
  message: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
