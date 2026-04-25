import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ComboMeterProps {
  combo: number;
}

export function ComboMeter({ combo }: ComboMeterProps) {
  if (combo < 2) return null;

  const tier =
    combo >= 10 ? { color: '#A78BFA', label: 'Combo épico!' } :
    combo >= 6  ? { color: '#F472B6', label: 'Combo!' } :
    combo >= 3  ? { color: '#FFD700', label: 'Combo' } :
                  { color: '#9CA3AF', label: '' };

  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={[styles.combo, { color: tier.color }]}>×{combo}</Text>
      {!!tier.label && <Text style={[styles.label, { color: tier.color }]}>{tier.label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    right: 16,
    alignItems: 'center',
    zIndex: 100,
  },
  combo: {
    fontSize: 28,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
