/**
 * SecureStore-backed storage with an AsyncStorage-compatible async interface
 * (getItem / setItem / removeItem). Used for sensitive auth material: the
 * Firebase ID token and the Firebase Auth SDK session (which holds the
 * long-lived refresh token).
 *
 * Two reasons a raw expo-secure-store call isn't a drop-in replacement:
 *  1. SecureStore keys must match [A-Za-z0-9._-]; the Firebase SDK uses keys
 *     like "firebase:authUser:<apiKey>:[DEFAULT]" (colons, brackets). We
 *     hex-encode the logical key into a safe, collision-free physical key.
 *  2. SecureStore values are capped (~2048 bytes; larger warns/fails on
 *     Android). The Firebase session JSON exceeds that, so we transparently
 *     chunk the value and store a small meta entry with the chunk count.
 *
 * ponytail: CHUNK_SIZE 1800 is conservative and counts characters, which equals
 * bytes for the ASCII tokens/JSON we store. If we ever persist large non-ASCII
 * values here, switch the split to a byte-aware one.
 */
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;
const PREFIX = 'ss_';

/** Map an arbitrary logical key to a SecureStore-safe physical key prefix. */
function encodeKey(key: string): string {
  let out = PREFIX;
  for (let i = 0; i < key.length; i++) {
    out += key.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return out;
}

async function removeChunks(enc: string): Promise<void> {
  const meta = await SecureStore.getItemAsync(`${enc}_n`);
  if (meta == null) return;
  const n = parseInt(meta, 10);
  if (Number.isFinite(n)) {
    for (let i = 0; i < n; i++) {
      await SecureStore.deleteItemAsync(`${enc}_${i}`);
    }
  }
  await SecureStore.deleteItemAsync(`${enc}_n`);
}

async function getItem(key: string): Promise<string | null> {
  const enc = encodeKey(key);
  const meta = await SecureStore.getItemAsync(`${enc}_n`);
  if (meta == null) return null;
  const n = parseInt(meta, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  let value = '';
  for (let i = 0; i < n; i++) {
    const part = await SecureStore.getItemAsync(`${enc}_${i}`);
    if (part == null) return null; // partial/corrupted write — treat as absent
    value += part;
  }
  return value;
}

async function setItem(key: string, value: string): Promise<void> {
  const enc = encodeKey(key);
  // Drop previous chunks first so a shorter value can't leave stale tails.
  await removeChunks(enc);
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  if (chunks.length === 0) chunks.push(''); // empty string round-trips as "" not null
  for (let i = 0; i < chunks.length; i++) {
    await SecureStore.setItemAsync(`${enc}_${i}`, chunks[i]);
  }
  await SecureStore.setItemAsync(`${enc}_n`, String(chunks.length));
}

async function removeItem(key: string): Promise<void> {
  await removeChunks(encodeKey(key));
}

export const secureStorage = { getItem, setItem, removeItem };
export default secureStorage;
