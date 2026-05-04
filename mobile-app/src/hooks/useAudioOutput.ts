import { useEffect, useState } from 'react';
import { Audio } from 'expo-av';

const HEADPHONE_TYPES = new Set([
  'BluetoothA2DP',
  'BluetoothLE',
  'BluetoothHFP',
  'Headphones',
  'Headset',
  'WiredHeadphones',
  'WiredHeadset',
  'LineOut',
]);

export function useAudioOutput(pollMs = 5000) {
  const [headphonesConnected, setHeadphonesConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        // Probing: expo-av's Audio object exposes various status/device APIs across versions.
        // We try a few feature probes — fall back to false (speaker assumed).
        // @ts-ignore — runtime feature detection
        const status: any = (await (Audio as any).getStatusAsync?.()) ?? {};
        const outputs: any[] = status?.outputs ?? [];
        const detected = outputs.some((o: any) => HEADPHONE_TYPES.has(o?.type ?? ''));
        if (!cancelled) setHeadphonesConnected(Boolean(detected));
      } catch {
        if (!cancelled) setHeadphonesConnected(false);
      }
    };

    check();
    const interval = setInterval(check, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs]);

  return { headphonesConnected };
}
