/**
 * Compra In-App iOS: a prova (JWS) vai pro backend ANTES de encerrar a
 * transação, e o acesso só é anunciado quando o backend aceita.
 */
import * as iapLib from 'expo-iap';
import { apiClient } from '../../src/services/api/client';
import {
  buyShowcase,
  onPurchaseGranted,
  restorePurchases,
  startIapSession,
} from '../../src/services/iap';

jest.mock('../../src/constants/store-policy', () => ({ USE_NATIVE_IAP: true }));
jest.mock('../../src/services/api/client', () => ({ apiClient: { post: jest.fn() } }));

const lib = iapLib as jest.Mocked<typeof iapLib>;
const post = apiClient.post as jest.Mock;
const purchase = { productId: 'showcase.castracao', purchaseToken: 'jws-123' } as iapLib.Purchase;

// A sessão é singleton no módulo: o listener é registrado uma vez só.
let onPurchase: (p: iapLib.Purchase) => Promise<void> | void;

beforeAll(async () => {
  await startIapSession();
  onPurchase = lib.purchaseUpdatedListener.mock.calls[0][0];
});

describe('iap service (iOS)', () => {
  beforeEach(() => {
    post.mockReset();
    lib.finishTransaction.mockClear();
    lib.requestPurchase.mockClear();
  });

  it('abre a conexão e registra os listeners uma vez', async () => {
    expect(lib.initConnection).toHaveBeenCalledTimes(1);
    await startIapSession();
    expect(lib.initConnection).toHaveBeenCalledTimes(1);
    expect(lib.purchaseErrorListener).toHaveBeenCalledTimes(1);
  });

  it('compra concluída → POST com o JWS, finishTransaction e aviso do slug', async () => {
    post.mockResolvedValue({ data: { ok: true, showcaseSlug: 'castracao' } });
    const granted = jest.fn();
    const off = onPurchaseGranted(granted);

    await onPurchase(purchase);

    expect(post).toHaveBeenCalledWith('/showcases/purchases/apple', { jws: 'jws-123' });
    expect(lib.finishTransaction).toHaveBeenCalledWith({ purchase, isConsumable: false });
    expect(granted).toHaveBeenCalledWith('castracao');
    off();
  });

  it('backend recusa → transação NÃO é encerrada (fica pendente pra reentrega)', async () => {
    post.mockRejectedValue(new Error('400'));
    await onPurchase(purchase);
    expect(lib.finishTransaction).not.toHaveBeenCalled();
  });

  it('buyShowcase pede a compra do sku no StoreKit', async () => {
    await buyShowcase('showcase.castracao');
    expect(lib.requestPurchase).toHaveBeenCalledWith({
      request: { apple: { sku: 'showcase.castracao' } },
      type: 'in-app',
    });
  });

  it('restorePurchases reconfirma cada compra ativa e conta as liberadas', async () => {
    lib.getAvailablePurchases.mockResolvedValue([
      purchase,
      { ...purchase, productId: 'x', purchaseToken: null } as iapLib.Purchase,
    ]);
    post.mockResolvedValue({ data: { ok: true, showcaseSlug: 'castracao' } });
    await expect(restorePurchases()).resolves.toBe(1);
    expect(post).toHaveBeenCalledTimes(1);
  });
});
