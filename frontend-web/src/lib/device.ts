/**
 * Identidade deste navegador para o limite de dispositivos por conta
 * (`X-Device-Id` em toda requisição; backend: DevicesService). O id é um
 * uuid gerado uma vez e guardado em localStorage — não identifica a pessoa,
 * só "este navegador neste computador".
 */
const STORAGE_KEY = 'pc-device-id';

export function getDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return null; // storage bloqueado (modo privado restrito): segue sem header
  }
}

/** "Chrome · Windows" a partir do user agent; só pra o aluno reconhecer o aparelho na lista. */
export function describeUserAgent(ua: string): string {
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Navegador';
  const os =
    /Windows/.test(ua) ? 'Windows'
    : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : '';
  return os ? `${browser} · ${os}` : browser;
}

export function getDeviceHeaders(): Record<string, string> {
  const id = getDeviceId();
  if (!id) return {};
  return {
    'X-Device-Id': id,
    'X-Device-Name': describeUserAgent(navigator.userAgent),
    'X-Device-Platform': 'web',
  };
}
