import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useGamificationStore } from '../../stores/gamification-store';
import { RARITY_COLORS, RARITY_LABELS, resolveBadgeIcon } from '../../types/gamification.types';

export function BadgeUnlockModal() {
  const visible = useGamificationStore((s) => s.showBadgeUnlockModal);
  const data = useGamificationStore((s) => s.badgeUnlockData);
  const dismiss = useGamificationStore((s) => s.dismissBadgeUnlock);

  const scale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12, stiffness: 100 });
    } else {
      scale.value = 0;
    }
  }, [visible]);

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!visible || !data) return null;

  const rarityColor = RARITY_COLORS[data.rarity];
  const rarityLabel = RARITY_LABELS[data.rarity];
  const iconName = resolveBadgeIcon(data.icon) as keyof typeof Ionicons.glyphMap;
  const isLegendary = data.rarity === 'legendary';
  const isEpicOrHigher = data.rarity === 'epic' || isLegendary;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Rarity label */}
          <View style={[styles.rarityPill, { backgroundColor: rarityColor.bg, borderColor: rarityColor.border }]}>
            <Text style={[styles.rarityText, { color: rarityColor.text }]}>{rarityLabel}</Text>
          </View>

          {/* Badge icon */}
          <Animated.View
            style={[
              styles.badgeCircle,
              badgeAnimStyle,
              {
                borderColor: rarityColor.border,
                backgroundColor: rarityColor.bg,
              },
            ]}
          >
            <Ionicons name={iconName} size={40} color={rarityColor.text} />
          </Animated.View>

          {/* Glow ring for legendary */}
          {isLegendary && <GlowRing color={rarityColor.border} />}

          <Text style={styles.subtitle}>Conquista desbloqueada!</Text>
          <Text style={[styles.title, { color: rarityColor.text }]}>{data.name}</Text>

          {data.description ? (
            <Text style={styles.description}>{data.description}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: rarityColor.border }]}
            onPress={dismiss}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Incrivel!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function GlowRing({ color }: { color: string }) {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 0.3,
  }));

  return (
    <Animated.View
      style={[
        styles.glowRing,
        style,
        { borderColor: color },
      ]}
    />
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
  },
  rarityPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  rarityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  glowRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    marginTop: -20,
    marginLeft: -60,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 8,
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
