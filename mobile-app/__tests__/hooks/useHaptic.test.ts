import { renderHook, act } from '@testing-library/react-native';
import { useHaptic } from '../../src/hooks/useHaptic';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Warning: 'warning', Success: 'success' },
}));

describe('useHaptic', () => {
  it('fires correct trigger as light impact', async () => {
    const Haptics = require('expo-haptics');
    const { result } = renderHook(() => useHaptic());
    await act(async () => {
      await result.current.fire('correct');
    });
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('fires wrong trigger as warning notification', async () => {
    const Haptics = require('expo-haptics');
    const { result } = renderHook(() => useHaptic());
    await act(async () => {
      await result.current.fire('wrong');
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
  });

  it('fires levelup as success notification', async () => {
    const Haptics = require('expo-haptics');
    const { result } = renderHook(() => useHaptic());
    await act(async () => {
      await result.current.fire('levelup');
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });
});
