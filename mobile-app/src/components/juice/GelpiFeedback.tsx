import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import DrGelpiDOM from './dom/DrGelpiDOM';

export type GelpiFeedbackKind = 'correct' | 'wrong';

interface GelpiFeedbackProps {
  kind: GelpiFeedbackKind | null;
  onDone?: () => void;
}

const FEEDBACK_DURATION_MS = 1800;

export function GelpiFeedback({ kind, onDone }: GelpiFeedbackProps) {
  const triggerRef = useRef(0);
  const [triggerKey, setTriggerKey] = useState(0);

  useEffect(() => {
    if (!kind) return;
    triggerRef.current += 1;
    setTriggerKey(triggerRef.current);
    const t = setTimeout(() => onDone?.(), FEEDBACK_DURATION_MS);
    return () => clearTimeout(t);
  }, [kind, onDone]);

  const visible = kind !== null;
  const state: 'celebrate' | 'wrong' | 'idle' =
    kind === 'correct' ? 'celebrate' : kind === 'wrong' ? 'wrong' : 'idle';

  return (
    <View style={styles.overlay} pointerEvents="none">
      <DrGelpiDOM
        visible={visible}
        state={state}
        triggerKey={triggerKey}
        dom={{
          scrollEnabled: false,
          contentInsetAdjustmentBehavior: 'never',
          style: { width: '100%', height: '100%', backgroundColor: 'transparent' },
        }}
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
    zIndex: 950,
  },
});
