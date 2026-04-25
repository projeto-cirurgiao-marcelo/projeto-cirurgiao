// Override do mock global de reanimated. O setup.ts global usa
// `react-native-reanimated/mock`, que internamente importa o real reanimated 4
// e quebra em `createSerializable` (worklets stub incompleto). Aqui dropamos
// um stub minimo, suficiente para XpBurst (que so usa hooks/utilitarios JS).
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const passthrough = (value: unknown) => ({ value });
  const noopTiming = (toValue: unknown) => toValue;
  return {
    __esModule: true,
    default: {
      View: React.forwardRef(
        (props: Record<string, unknown>, ref: unknown) =>
          React.createElement(View, { ...props, ref }),
      ),
    },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (fn: () => unknown) => {
      try {
        return fn();
      } catch {
        return {};
      }
    },
    withTiming: noopTiming,
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withSpring: noopTiming,
    withDelay: (_d: unknown, v: unknown) => v,
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    Easing: {
      in: (fn: unknown) => fn,
      out: (fn: unknown) => fn,
      inOut: (fn: unknown) => fn,
      quad: (t: number) => t,
      cubic: (t: number) => t,
      back: () => (t: number) => t,
    },
    // ALguns consumers usam `View` direto (sem default).
    View: React.forwardRef(
      (props: Record<string, unknown>, ref: unknown) =>
        React.createElement(View, { ...props, ref }),
    ),
  };
});

import { render, screen } from '@testing-library/react-native';
import { XpBurst } from '../../../src/components/juice/XpBurst';

describe('XpBurst', () => {
  it('renders nothing when invisible', () => {
    render(<XpBurst xp={50} visible={false} />);
    expect(screen.queryByText(/XP/)).toBeNull();
  });

  it('renders xp value when visible', () => {
    render(<XpBurst xp={42} visible={true} />);
    expect(screen.getByText('+42 XP')).toBeTruthy();
  });
});
