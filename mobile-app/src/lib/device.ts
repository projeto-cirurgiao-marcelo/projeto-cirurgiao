/**
 * Identidade deste aparelho para o limite de dispositivos por conta
 * (`X-Device-Id` em toda requisição; backend: DevicesService). Id gerado uma
 * vez e guardado no SecureStore — sobrevive a logout, não a reinstalação.
 */
import { Platform } from 'react-native';
import secureStorage from './secure-storage';

const STORAGE_KEY = 'deviceId';
let cached: string | null = null;
let loading: Promise<string> | null = null;

function newId(): string {
  const rnd = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rnd()}${rnd()}`;
}

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  if (!loading) {
    loading = (async () => {
      let id = await secureStorage.getItem(STORAGE_KEY);
      if (!id) {
        id = newId();
        await secureStorage.setItem(STORAGE_KEY, id);
      }
      cached = id;
      return id;
    })().finally(() => {
      loading = null;
    });
  }
  return loading;
}

/** "iPhone" / "Samsung SM-A515F": só pra o aluno reconhecer o aparelho na lista. */
export function describeDevice(
  os: string = Platform.OS,
  constants: Record<string, unknown> = (Platform.constants ?? {}) as Record<string, unknown>,
): string {
  if (os === 'ios') {
    const idiom = String(constants.interfaceIdiom ?? '');
    return idiom === 'pad' ? 'iPad' : 'iPhone';
  }
  const brand = String(constants.Brand ?? '').trim();
  const model = String(constants.Model ?? '').trim();
  const name = [brand && brand[0].toUpperCase() + brand.slice(1), model].filter(Boolean).join(' ');
  return name || 'Android';
}

export async function getDeviceHeaders(): Promise<Record<string, string>> {
  try {
    return {
      'X-Device-Id': await getDeviceId(),
      'X-Device-Name': describeDevice(),
      'X-Device-Platform': Platform.OS === 'ios' ? 'ios' : 'android',
    };
  } catch {
    return {}; // SecureStore indisponível: segue sem header (backend trata como cliente antigo)
  }
}
