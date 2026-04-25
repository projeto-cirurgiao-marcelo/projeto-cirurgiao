import React, { useMemo } from 'react';
import { Dimensions, View, StyleSheet } from 'react-native';
import {
  Canvas,
  Group,
  Rect,
  useClock,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

interface ConfettiSkiaProps {
  active: boolean;
  count?: number;
}

interface PieceSeed {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  color: string;
  width: number;
  height: number;
}

const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#A78BFA', '#F472B6'];
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const GRAVITY = 0.6; // px per frame^2
const FRAME_MS = 16.667;

function makePieces(count: number): PieceSeed[] {
  const arr: PieceSeed[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      x0: SCREEN_W / 2 + (Math.random() - 0.5) * 40,
      y0: SCREEN_H / 3,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 10 - 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      width: 6 + Math.random() * 6,
      height: 3 + Math.random() * 3,
    });
  }
  return arr;
}

interface PieceProps {
  seed: PieceSeed;
  clock: SharedValue<number>;
  startMs: number;
}

function Piece({ seed, clock, startMs }: PieceProps) {
  const frame = useDerivedValue(() => {
    const elapsed = clock.value - startMs;
    return elapsed > 0 ? elapsed / FRAME_MS : 0;
  });
  const x = useDerivedValue(() => seed.x0 + seed.vx * frame.value);
  const y = useDerivedValue(
    () =>
      seed.y0 +
      seed.vy * frame.value +
      0.5 * GRAVITY * frame.value * frame.value,
  );

  return (
    <Rect
      x={x}
      y={y}
      width={seed.width}
      height={seed.height}
      color={seed.color}
    />
  );
}

export function ConfettiSkia({ active, count = 60 }: ConfettiSkiaProps) {
  const clock = useClock();
  const pieces = useMemo(() => makePieces(count), [count, active]);
  const startMs = useMemo(() => Date.now(), [active]);

  if (!active) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Group>
          {pieces.map((p, i) => (
            <Piece key={i} seed={p} clock={clock} startMs={startMs} />
          ))}
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
    zIndex: 1000,
  },
});
