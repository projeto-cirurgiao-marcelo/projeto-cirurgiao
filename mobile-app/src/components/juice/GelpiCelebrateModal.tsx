import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfidenceRating } from '../quiz/ConfidenceRating';
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

/**
 * Quanto esperamos pelo handshake da WebView antes de assumir que ela não vem.
 * 2.5s é folgado para o mount de um DOM component já embarcado no bundle (no
 * iOS chega em ~200ms) e curto o bastante para o aluno não achar que travou.
 */
const DOM_READY_TIMEOUT_MS = 2500;

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
  // ponytail: um booleano e um timer resolvem. Não vale máquina de estados aqui
  // — só existem dois desfechos: a WebView responde ou não responde.
  const [domReady, setDomReady] = useState(false);
  const [domTimedOut, setDomTimedOut] = useState(false);

  useEffect(() => {
    if (!kind) return;
    triggerRef.current += 1;
    setTriggerKey(triggerRef.current);
  }, [kind]);

  // Enquanto o modal está visível, corre um timer de segurança. Se a WebView
  // não sinalizar `onReady` a tempo, liberamos o caminho nativo — sem ele o
  // quiz fica preso para sempre, porque `handleContinue` no QuizPlayer exige
  // uma confiança que só a WebView conseguiria coletar.
  useEffect(() => {
    if (!kind || domReady) return;
    const t = setTimeout(() => setDomTimedOut(true), DOM_READY_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [kind, domReady]);

  // Cada nova pergunta recomeça o ciclo.
  useEffect(() => {
    if (!kind) setDomTimedOut(false);
  }, [kind]);

  const visible = kind !== null;
  const state: 'celebrate' | 'wrong' | 'idle' =
    kind === 'correct' ? 'celebrate' : kind === 'wrong' ? 'wrong' : 'idle';
  const title = kind === 'wrong' ? TITLE_WRONG : TITLE_CORRECT;
  const subtitle = kind === 'wrong' ? SUBTITLE_WRONG : SUBTITLE_CORRECT;

  const useFallback = visible && domTimedOut && !domReady;

  if (useFallback) {
    return (
      <View style={styles.overlay} pointerEvents="auto">
        <View style={styles.fallbackBackdrop}>
          <View style={styles.fallbackCard}>
            <Text style={styles.fallbackTitle}>{title}</Text>
            <Text style={styles.fallbackSubtitle}>{subtitle}</Text>
            {xpGained > 0 && (
              <Text style={styles.fallbackXp}>+{xpGained} XP</Text>
            )}

            <ConfidenceRating
              selected={selectedConfidence}
              onSelect={onSelectConfidence}
            />

            <Pressable
              accessibilityRole="button"
              disabled={!selectedConfidence}
              onPress={onContinue}
              style={[
                styles.fallbackContinue,
                !selectedConfidence && styles.fallbackContinueDisabled,
              ]}
            >
              <Text style={styles.fallbackContinueText}>Continuar →</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

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
        onReady={async () => {
          setDomReady(true);
        }}
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
  fallbackBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  fallbackCard: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
    textAlign: 'center',
  },
  fallbackSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
  },
  fallbackXp: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 12,
  },
  fallbackContinue: {
    marginTop: 8,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  fallbackContinueDisabled: {
    backgroundColor: '#374151',
  },
  fallbackContinueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
