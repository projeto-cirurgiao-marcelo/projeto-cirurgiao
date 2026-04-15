import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInRight, FadeOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGamificationStore } from '../../stores/gamification-store';

export function XpPopup() {
  const insets = useSafeAreaInsets();
  const queue = useGamificationStore((s) => s.xpPopupQueue);
  const dismiss = useGamificationStore((s) => s.dismissXpPopup);

  if (queue.length === 0) return null;

  return (
    <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
      {queue.map((item, index) => (
        <Animated.View
          key={item.id}
          entering={FadeInRight.springify().damping(15).stiffness(120)}
          exiting={FadeOutRight.duration(200)}
          style={[styles.popup, { marginTop: index * 4 }]}
        >
          <Pressable style={styles.content} onPress={() => dismiss(item.id)}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles" size={14} color="#D97706" />
            </View>
            <Text style={styles.xpText}>+{item.xp} XP</Text>
            {item.description ? (
              <Text style={styles.descText} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    left: 12,
    alignItems: 'flex-end',
    zIndex: 999,
  },
  popup: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    elevation: 6,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  xpText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D97706',
  },
  descText: {
    fontSize: 13,
    color: '#92400E',
    flexShrink: 1,
    maxWidth: 180,
  },
});
