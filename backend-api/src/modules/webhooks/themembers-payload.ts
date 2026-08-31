/**
 * Estrutura do webhook do checkout TheMembers.
 * Confirmada na doc oficial (documentation.themembers.dev.br/webhooks) em 2026-08-31.
 * Auth: header `X-Signature` = HMAC-SHA256 do corpo cru com o security_token do webhook.
 */
export interface ThemembersWebhook {
  company?: { id?: string; name?: string; email?: string };
  payload?: ThemembersPayload;
}

export interface ThemembersPayload {
  /** id do evento — usado (com o event) como chave de idempotência. */
  id?: string;
  object?: string;
  /** ex.: 'release.access', 'revoke.access', 'transaction.approved'. */
  event?: string;
  data?: ThemembersData;
}

export interface ThemembersData {
  status?: string;
  customer?: {
    id?: string;
    name?: string;
    email?: string;
    document_type?: string;
    document_number?: string;
  };
  product?: {
    /** key numérica — mapeia para Showcase.externalProductId. */
    id?: string;
    name?: string;
    price?: number;
    quantity?: number;
    /** 'YYYY-MM-DD HH:mm:ss' ou ausente (vitalício). */
    expires_in?: string | null;
    /** UUID do produto (link de edição). */
    reference_id?: string;
    platform?: { id?: string; name?: string };
  };
  order?: {
    id?: string;
    total?: number;
    transaction?: {
      paid_at?: string;
      payment_method?: string;
      status?: string;
    };
  };
}

export const EVENT_RELEASE = 'release.access';
export const EVENT_REVOKE = 'revoke.access';
