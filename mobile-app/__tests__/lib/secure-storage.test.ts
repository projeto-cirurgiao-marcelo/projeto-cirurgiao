/**
 * Mock expo-secure-store reproducing the two real constraints the adapter
 * exists to work around: keys must be [A-Za-z0-9._-] and values are capped at
 * 2048 bytes. If the adapter's key-encoding or chunking broke, these throws
 * would surface as test failures.
 */
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    setItemAsync: jest.fn(async (key: string, value: string) => {
      if (!/^[A-Za-z0-9._-]+$/.test(key)) throw new Error(`Invalid key: ${key}`);
      if (typeof value !== 'string' || value.length > 2048) {
        throw new Error('Value too large for SecureStore');
      }
      store.set(key, value);
    }),
    getItemAsync: jest.fn(async (key: string) =>
      store.has(key) ? store.get(key)! : null,
    ),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

import * as SecureStore from 'expo-secure-store';
import secureStorage from '../../src/lib/secure-storage';

const rawStore = (SecureStore as any).__store as Map<string, string>;

beforeEach(() => rawStore.clear());

describe('secureStorage', () => {
  it('round-trips a small value', async () => {
    await secureStorage.setItem('firebaseToken', 'abc.def.ghi');
    expect(await secureStorage.getItem('firebaseToken')).toBe('abc.def.ghi');
  });

  it('returns null for an absent key', async () => {
    expect(await secureStorage.getItem('missing')).toBeNull();
  });

  it('chunks values larger than the 2048-byte limit', async () => {
    const big = 'x'.repeat(5000); // would throw without chunking
    await secureStorage.setItem('firebase:authUser:KEY:[DEFAULT]', big);
    expect(await secureStorage.getItem('firebase:authUser:KEY:[DEFAULT]')).toBe(big);
  });

  it('encodes keys containing chars SecureStore rejects (colons/brackets)', async () => {
    // The throw in the mock for invalid keys would fail this if not encoded.
    await secureStorage.setItem('firebase:authUser:AIza:[DEFAULT]', 'session');
    expect(await secureStorage.getItem('firebase:authUser:AIza:[DEFAULT]')).toBe('session');
  });

  it('does not leave stale chunks when overwriting with a shorter value', async () => {
    await secureStorage.setItem('k', 'y'.repeat(5000)); // 3 chunks
    await secureStorage.setItem('k', 'short'); // 1 chunk
    expect(await secureStorage.getItem('k')).toBe('short');
    // Only one data chunk (_0) + meta (_n) should remain; no _1/_2 tails.
    const dataChunks = [...rawStore.keys()].filter((key) => /_\d+$/.test(key));
    expect(dataChunks).toHaveLength(1);
  });

  it('removeItem clears all chunks', async () => {
    await secureStorage.setItem('k', 'z'.repeat(5000));
    await secureStorage.removeItem('k');
    expect(await secureStorage.getItem('k')).toBeNull();
    expect(rawStore.size).toBe(0);
  });
});
