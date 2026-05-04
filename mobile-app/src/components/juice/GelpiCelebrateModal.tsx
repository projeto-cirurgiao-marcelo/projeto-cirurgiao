import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import GelpiCelebrateModalDOM, {
  type ConfidenceLevel,
} from './dom/GelpiCelebrateModalDOM';

export type GelpiCelebrateKind = 'correct' | 'wrong';

interface GelpiCelebrateModalProps {
  kind: GelpiCelebrateKind | null;
  xpGained: number;
  comboValue: number;
  accuracyPct: number;
  selectedConfidence?: ConfidenceLevel;
  onSelectConfidence: (level: ConfidenceLevel) => void;
  onContinue: () => void;
}

const TITLE_CORRECT = 'Excelente, doutor!';
const SUBTITLE_CORRECT = 'Resposta certeira — diagnóstico em segundos.';
const TITLE_WRONG = 'Quase lá, doutor!';
const SUBTITLE_WRONG = 'Vamos revisar essa juntos.';

export function GelpiCelebrateModal({
  kind,
  xpGained,
  comboValue,
  accuracyPct,
  selectedConfidence,
  onSelectConfidence,
  onContinue,
}: GelpiCelebrateModalProps) {
  const triggerRef = useRef(0);
  const [triggerKey, setTriggerKey] = useState(0);

  useEffect(() => {
    if (!kind) return;
    triggerRef.current += 1;
    setTriggerKey(triggerRef.current);
  }, [kind]);

  const visible = kind !== null;
  const state: 'celebrate' | 'wrong' | 'idle' =
    kind === 'correct' ? 'celebrate' : kind === 'wrong' ? 'wrong' : 'idle';
  const title = kind === 'wrong' ? TITLE_WRONG : TITLE_CORRECT;
  const subtitle = kind === 'wrong' ? SUBTITLE_WRONG : SUBTITLE_CORRECT;

  return (
    <View
      style={styles.overlay}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <GelpiCelebrateModalDOM
        visible={visible}
        state={state}
        triggerKey={triggerKey}
        title={title}
        subtitle={subtitle}
        xpGained={xpGained}
        comboValue={comboValue}
        accuracyPct={accuracyPct}
        selectedConfidence={selectedConfidence}
        onSelectConfidence={async (level) => {
          onSelectConfidence(level);
        }}
        onContinue={async () => {
          onContinue();
        }}
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
