/**
 * CircularProgress - Indicador circular de progresso
 * Renderizado com SVG-like approach usando Views
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight } from '../../constants/colors';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  labelColor?: string;
}

export function CircularProgress({
  percentage,
  size = 44,
  strokeWidth = 4,
  color = Colors.accent,
  backgroundColor = Colors.border,
  showLabel = true,
  labelColor = Colors.accent,
}: CircularProgressProps) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const halfSize = size / 2;

  // We'll use a simpler approach with two half-circle overlays
  // since react-native doesn't have SVG built-in
  const rotation = (clampedPercentage / 100) * 360;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background circle */}
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: backgroundColor,
          },
        ]}
      />

      {/* Progress - Right half (0 to 180 degrees) */}
      <View style={[styles.halfContainer, { width: halfSize, height: size, left: halfSize }]}>
        <View
          style={[
            styles.halfCircle,
            {
              width: size,
              height: size,
              borderRadius: halfSize,
              borderWidth: strokeWidth,
              borderColor: color,
              left: -halfSize,
              transform: [
                { rotate: `${rotation <= 180 ? rotation - 180 : 0}deg` },
              ],
            },
          ]}
        />
      </View>

      {/* Progress - Left half (180 to 360 degrees) */}
      {rotation > 180 && (
        <View style={[styles.halfContainer, { width: halfSize, height: size, left: 0 }]}>
          <View
            style={[
              styles.halfCircle,
              {
                width: size,
                height: size,
                borderRadius: halfSize,
                borderWidth: strokeWidth,
                borderColor: color,
                left: 0,
                transform: [
                  { rotate: `${rotation - 360}deg` },
                ],
              },
            ]}
          />
        </View>
      )}

      {/* Label */}
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text
            style={[
              styles.label,
              {
                color: labelColor,
                fontSize: size < 40 ? 10 : size < 56 ? 11 : 13,
              },
            ]}
          >
            {Math.round(clampedPercentage)}%
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
  },
  halfContainer: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  halfCircle: {
    position: 'absolute',
    top: 0,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  labelContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontWeight: FontWeight.bold,
  },
});

export default CircularProgress;
