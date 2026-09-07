import React from 'react';
import { act, render } from '@testing-library/react-native';
import RootLayout from '../../app/_layout';

const mockLoadUser = jest.fn();
let mockState = { hasHydrated: false, isAuthenticated: false, loadUser: mockLoadUser };

jest.mock('../../src/stores/auth-store', () => ({
  __esModule: true,
  default: Object.assign((selector: (state: typeof mockState) => unknown) => selector(mockState), {
    getState: () => mockState,
  }),
}));
jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Stack = ({ children }: { children: React.ReactNode }) => children;
  Stack.Screen = ({ name }: { name: string }) => React.createElement(Text, null, name);
  Stack.Protected = ({ guard, children }: { guard: boolean; children: React.ReactNode }) => guard ? children : null;
  return { Stack };
});
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-toast-message', () => ({ __esModule: true, default: () => null }));
jest.mock('../../src/components/ui/OfflineBanner', () => ({ OfflineBanner: () => null }));
jest.mock('../../src/config/sentry', () => ({ initSentry: jest.fn() }));
jest.mock('../../src/components/gamification/GamificationCelebrationProvider', () => ({
  GamificationCelebrationProvider: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, 'celebrations');
  },
}));

beforeEach(() => {
  mockState = { hasHydrated: false, isAuthenticated: false, loadUser: mockLoadUser };
  mockLoadUser.mockReset().mockResolvedValue(undefined);
});

it('waits for storage hydration and session resolution before mounting any routes', async () => {
  let finish!: () => void;
  mockLoadUser.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
  const screen = render(<RootLayout />);
  expect(mockLoadUser).not.toHaveBeenCalled();
  expect(screen.queryByText('(auth)')).toBeNull();

  mockState.hasHydrated = true;
  screen.rerender(<RootLayout />);
  expect(mockLoadUser).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('(auth)')).toBeNull();
  await act(async () => { finish(); });
  expect(screen.getByText('(auth)')).toBeTruthy();
});

it('keeps only public routes available to logged-out users, including deep-link targets', async () => {
  mockState.hasHydrated = true;
  const screen = render(<RootLayout />);
  await act(async () => {});
  expect(screen.getByText('(auth)')).toBeTruthy();
  expect(screen.getByText('help')).toBeTruthy();
  for (const name of ['(onboarding)', '(tabs)', 'course', 'courses', 'forum', 'profile', 'celebrations']) {
    expect(screen.queryByText(name)).toBeNull();
  }
});

it('removes all private routes and celebrations on logout without rerunning bootstrap', async () => {
  mockState.hasHydrated = true;
  mockState.isAuthenticated = true;
  const screen = render(<RootLayout />);
  await act(async () => {});
  for (const name of ['(onboarding)', '(tabs)', 'course', 'courses', 'forum', 'profile', 'celebrations']) {
    expect(screen.getByText(name)).toBeTruthy();
  }
  expect(screen.queryByText('(auth)')).toBeNull();

  mockState.isAuthenticated = false;
  screen.rerender(<RootLayout />);
  for (const name of ['(onboarding)', '(tabs)', 'course', 'courses', 'forum', 'profile', 'celebrations']) {
    expect(screen.queryByText(name)).toBeNull();
  }
  expect(screen.getByText('(auth)')).toBeTruthy();
  expect(mockLoadUser).toHaveBeenCalledTimes(1);
});
