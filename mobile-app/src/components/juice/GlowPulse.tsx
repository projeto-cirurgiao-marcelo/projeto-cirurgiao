import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface GlowPulseProps {
  active: boolean;
  color?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GlowPulse({ active, color = '#FFD700', children, style }: GlowPulseProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      opacity.value = withRepeat(
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [active]);

  const overlayStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 16,
    backgroundColor: color,
    opacity: opacity.value,
    zIndex: -1,
  }));

  return (
    <Animated.View style={style}>
      <Animated.View style={overlayStyle} pointerEvents="none" />
      {children}
    </Animated.View>
  );
}
