import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const ASSETS = {
  correct: require('./assets/gelpi-correct.json'),
  wrong: require('./assets/gelpi-wrong.json'),
};

export type LottieFeedbackKind = 'correct' | 'wrong';

interface LottieFeedbackProps {
  kind: LottieFeedbackKind | null;
  onDone?: () => void;
}

export function LottieFeedback({ kind, onDone }: LottieFeedbackProps) {
  const ref = useRef<LottieView>(null);

  useEffect(() => {
    if (!kind) return;
    ref.current?.reset();
    ref.current?.play();
  }, [kind]);

  if (!kind) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <LottieView
        ref={ref}
        source={ASSETS[kind]}
        autoPlay
        loop={false}
        style={styles.lottie}
        onAnimationFinish={onDone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 950,
  },
  lottie: {
    width: 280,
    height: 340,
  },
});
