import * as Haptics from 'expo-haptics';

type HapticTrigger = 'correct' | 'wrong' | 'comboTier' | 'levelup' | 'streakBreak';

export function useHaptic() {
  const fire = (kind: HapticTrigger) => {
    switch (kind) {
      case 'correct':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'comboTier':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case 'wrong':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      case 'levelup':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'streakBreak':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };
  return { fire };
}
