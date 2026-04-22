/**
 * Smoke test do handler de 429 (commit cacf99a).
 *
 * O interceptor axios e instalado quando client.ts eh importado — entao so
 * importamos uma vez no top do arquivo. O teste simula um erro 429 passando
 * direto pelo reject handler (nao precisa do `axios.create` real).
 */
import Toast from 'react-native-toast-message';

// Importa client.ts — dispara a instalacao dos interceptors no apiClient.
import { apiClient } from '../../src/services/api/client';

// Helper: recupera o reject handler instalado em response interceptor do apiClient.
// axios guarda interceptors em `interceptors.response.handlers`. Em versoes recentes
// do axios, cada handler tem { fulfilled, rejected }. Nosso handler 429 vive no rejected.
function getResponseRejectHandler(): (err: unknown) => unknown {
  // @ts-expect-error — API interna do axios.
  const handlers = apiClient.interceptors.response.handlers as Array<
    { fulfilled: unknown; rejected: (err: unknown) => unknown } | null
  >;
  const handler = handlers.find((h) => h && h.rejected);
  if (!handler) throw new Error('No response reject handler registered');
  return handler.rejected;
}

describe('apiClient 429 interceptor', () => {
  const toastShow = Toast.show as jest.Mock;

  beforeEach(() => {
    toastShow.mockClear();
  });

  it('mostra toast com duracao >= 4s quando 429 sem Retry-After', async () => {
    const reject = getResponseRejectHandler();
    const err = {
      response: {
        status: 429,
        headers: {},
      },
      config: {},
    };

    await expect(reject(err)).rejects.toBe(err);

    expect(toastShow).toHaveBeenCalledTimes(1);
    const call = toastShow.mock.calls[0][0];
    expect(call.type).toBe('error');
    expect(call.text1).toBe('Muitas requisições à IA');
    expect(call.text2).toBe('Aguarde alguns segundos e tente novamente.');
    expect(call.visibilityTime).toBe(4000);
  });

  it('mostra toast com segundos exatos quando Retry-After presente (delta-seconds)', async () => {
    const reject = getResponseRejectHandler();
    const err = {
      response: {
        status: 429,
        headers: { 'retry-after': '30' },
      },
      config: {},
    };

    await expect(reject(err)).rejects.toBe(err);

    expect(toastShow).toHaveBeenCalledTimes(1);
    const call = toastShow.mock.calls[0][0];
    expect(call.text2).toBe('Aguarde 30 segundos e tente novamente.');
    // max(4000, 30*1000) = 30000
    expect(call.visibilityTime).toBe(30000);
  });

  it('singular correto quando Retry-After=1', async () => {
    const reject = getResponseRejectHandler();
    const err = {
      response: {
        status: 429,
        headers: { 'retry-after': '1' },
      },
      config: {},
    };

    await expect(reject(err)).rejects.toBe(err);

    const call = toastShow.mock.calls[0][0];
    expect(call.text2).toBe('Aguarde 1 segundo e tente novamente.');
    // max(4000, 1*1000) = 4000 (piso)
    expect(call.visibilityTime).toBe(4000);
  });

  it('nao mostra toast quando status !== 429', async () => {
    const reject = getResponseRejectHandler();
    const err = {
      response: {
        status: 500,
        headers: {},
      },
      config: {},
    };

    await expect(reject(err)).rejects.toBe(err);

    expect(toastShow).not.toHaveBeenCalled();
  });

  it('Promise sempre rejeita (toast eh aditivo)', async () => {
    const reject = getResponseRejectHandler();
    const err = {
      response: {
        status: 429,
        headers: { 'retry-after': '5' },
      },
      config: {},
    };

    // Mesmo com toast mostrado, o erro continua propagando pros services.
    await expect(reject(err)).rejects.toBe(err);
  });
});
