import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

interface XpBurstProps {
  xp: number;
  visible: boolean;
  onDone?: () => void;
}

export function XpBurst({ xp, visible, onDone }: XpBurstProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (!visible) return;

    opacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(1, { duration: 700 }),
      withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished && onDone) runOnJS(onDone)();
      }),
    );
    translateY.value = withTiming(-80, { duration: 1200, easing: Easing.out(Easing.cubic) });
    scale.value = withSequence(
      withTiming(1.4, { duration: 200, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 1000 }),
    );
  }, [visible, xp]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <Text style={styles.text}>+{xp} XP</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    zIndex: 999,
    pointerEvents: 'none',
  },
  text: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFD700',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
