import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface ScreenShakeProps {
  trigger: number;
  intensity?: number;
  children: React.ReactNode;
}

export function ScreenShake({ trigger, intensity = 10, children }: ScreenShakeProps) {
  const x = useSharedValue(0);

  useEffect(() => {
    if (trigger === 0) return;
    x.value = withSequence(
      withTiming(-intensity, { duration: 50 }),
      withTiming(intensity, { duration: 50 }),
      withTiming(-intensity / 2, { duration: 50 }),
      withTiming(intensity / 2, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [trigger]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
