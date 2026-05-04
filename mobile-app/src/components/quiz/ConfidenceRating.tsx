import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export type ConfidenceLevel = 'GUESSED' | 'THOUGHT_KNEW' | 'KNEW' | 'MASTERED';

interface ConfidenceRatingProps {
  selected?: ConfidenceLevel;
  onSelect: (level: ConfidenceLevel) => void;
  disabled?: boolean;
}

const OPTIONS: { value: ConfidenceLevel; label: string; emoji: string }[] = [
  { value: 'GUESSED',      label: 'Chutei',          emoji: '🎲' },
  { value: 'THOUGHT_KNEW', label: 'Achei que sabia', emoji: '🤔' },
  { value: 'KNEW',         label: 'Sabia',           emoji: '✓' },
  { value: 'MASTERED',     label: 'Dominei',         emoji: '⭐' },
];

export function ConfidenceRating({ selected, onSelect, disabled }: ConfidenceRatingProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Como você se sentiu?</Text>
      <View style={styles.buttons}>
        {OPTIONS.map((opt) => {
          const active = selected === opt.value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled }}
              disabled={disabled}
              onPress={() => onSelect(opt.value)}
              style={[styles.button, active && styles.buttonActive]}
            >
              <Text style={styles.emoji}>{opt.emoji}</Text>
              <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 12 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    minHeight: 64,
  },
  buttonActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  emoji: { fontSize: 22, marginBottom: 4 },
  label: { fontSize: 11, color: '#D1D5DB', textAlign: 'center' },
  labelActive: { color: '#111827', fontWeight: '700' },
});
