/**
 * Compra In-App (iOS, StoreKit 2 via expo-iap). Fluxo:
 *   buyShowcase(productId) → App Store → purchaseUpdatedListener →
 *   POST /showcases/purchases/apple { jws } (backend valida e concede o
 *   Entitlement) → finishTransaction → avisa as telas (onPurchaseGranted).
 *
 * O backend é quem decide o acesso: o app nunca libera nada sozinho a partir
 * do recibo. Fora do iOS tudo aqui é no-op (USE_NATIVE_IAP).
 */
import { Alert } from 'react-native';
import {
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
} from 'expo-iap';
import { apiClient } from './api/client';
import { USE_NATIVE_IAP } from '../constants/store-policy';
import { logger } from '../lib/logger';

type GrantedListener = (showcaseSlug: string) => void;
const grantedListeners = new Set<GrantedListener>();
let session: { remove: () => void } | null = null;
let connecting: Promise<void> | null = null;

/** Telas interessadas (prévia, player) recarregam quando uma compra é liberada. */
export function onPurchaseGranted(listener: GrantedListener): () => void {
  grantedListeners.add(listener);
  return () => grantedListeners.delete(listener);
}

/** Manda a prova de compra pro backend e encerra a transação na App Store. */
async function confirmPurchase(purchase: Purchase): Promise<string | null> {
  const jws = purchase.purchaseToken;
  if (!jws) {
    logger.warn('[IAP] compra sem purchaseToken', purchase.productId);
    return null;
  }
  const { data } = await apiClient.post<{ ok: boolean; showcaseSlug: string }>(
    '/showcases/purchases/apple',
    { jws },
  );
  // Só depois do backend aceitar: se falhar, a transação fica pendente e a
  // App Store reentrega no próximo início do app (nada se perde).
  await finishTransaction({ purchase, isConsumable: false });
  return data.showcaseSlug;
}

/**
 * Abre a conexão com a App Store e passa a ouvir compras concluídas —
 * inclusive as que ficaram pendentes de uma sessão anterior. Chamar uma
 * vez, com o usuário autenticado (o POST precisa do token).
 */
export async function startIapSession(): Promise<void> {
  if (!USE_NATIVE_IAP || session) return;
  if (connecting) return connecting;
  connecting = (async () => {
    try {
      await initConnection();
    } catch (e) {
      logger.warn('[IAP] initConnection falhou', e);
      connecting = null;
      return;
    }
    const updated = purchaseUpdatedListener(async (purchase) => {
      try {
        const slug = await confirmPurchase(purchase);
        if (slug) grantedListeners.forEach((fn) => fn(slug));
      } catch (e) {
        logger.error('[IAP] falha ao confirmar compra', e);
        Alert.alert(
          'Compra em processamento',
          'Recebemos seu pagamento, mas não conseguimos liberar o curso agora. Abra o app novamente em instantes ou use "Restaurar compras" no perfil.',
        );
      }
    });
    const failed = purchaseErrorListener((error) => {
      if (error.code === ErrorCode.UserCancelled) return;
      logger.warn('[IAP] erro na compra', error.code, error.message);
      Alert.alert('Não foi possível concluir a compra', 'Tente novamente em alguns instantes.');
    });
    session = {
      remove: () => {
        updated.remove();
        failed.remove();
      },
    };
  })();
  return connecting;
}

/** Preço localizado por productId (ex.: "R$ 299,90"), pra mostrar no botão. */
export async function loadPrices(productIds: string[]): Promise<Map<string, string>> {
  const prices = new Map<string, string>();
  if (!USE_NATIVE_IAP || productIds.length === 0) return prices;
  try {
    const products = (await fetchProducts({ skus: productIds, type: 'in-app' })) ?? [];
    for (const p of products) prices.set(p.id, p.displayPrice);
  } catch (e) {
    logger.warn('[IAP] fetchProducts falhou', e);
  }
  return prices;
}

/** Abre a folha de compra da App Store. O resultado chega pelo listener. */
export async function buyShowcase(productId: string): Promise<void> {
  if (!USE_NATIVE_IAP) return;
  await startIapSession();
  await requestPurchase({ request: { apple: { sku: productId } }, type: 'in-app' });
}

/**
 * "Restaurar compras" (exigência da Apple pra não consumível): reconfirma
 * no backend tudo que a conta Apple já comprou. Devolve quantos liberou.
 */
export async function restorePurchases(): Promise<number> {
  if (!USE_NATIVE_IAP) return 0;
  await startIapSession();
  const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
  let granted = 0;
  for (const purchase of purchases) {
    try {
      const slug = await confirmPurchase(purchase);
      if (slug) {
        granted += 1;
        grantedListeners.forEach((fn) => fn(slug));
      }
    } catch (e) {
      logger.warn('[IAP] restore falhou para', purchase.productId, e);
    }
  }
  return granted;
}
