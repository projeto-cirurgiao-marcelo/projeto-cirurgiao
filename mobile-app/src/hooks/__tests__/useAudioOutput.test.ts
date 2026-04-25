import { renderHook, waitFor } from '@testing-library/react-native';
import { useAudioOutput } from '../useAudioOutput';

jest.mock('expo-av', () => ({
  Audio: {
    getStatusAsync: jest.fn().mockResolvedValue({ outputs: [{ type: 'Speaker' }] }),
  },
}));

describe('useAudioOutput', () => {
  it('returns headphonesConnected=false when only Speaker present', async () => {
    const { result } = renderHook(() => useAudioOutput(60_000));
    await waitFor(() => {
      expect(result.current.headphonesConnected).toBe(false);
    });
  });

  it('returns headphonesConnected=true when Headphones present', async () => {
    const { Audio } = require('expo-av');
    Audio.getStatusAsync.mockResolvedValueOnce({ outputs: [{ type: 'Headphones' }] });

    const { result } = renderHook(() => useAudioOutput(60_000));
    await waitFor(() => {
      expect(result.current.headphonesConnected).toBe(true);
    });
  });
});
