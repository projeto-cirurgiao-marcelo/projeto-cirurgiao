/**
 * URL de checkout de uma vitrine, derivada do produto TheMembers.
 * O TheMembers provê o checkout em `checkout.thebank.com.br/{productId}`
 * (campo `sales_page` do produto — confirmado universal). Derivar evita
 * campo manual no admin e chamada à API a cada request.
 *
 * Base configurável por env caso o gateway/domínio mude.
 */
export function checkoutUrlFor(externalProductId: string | null | undefined): string | null {
  if (!externalProductId) return null;
  const base = process.env.THEMEMBERS_CHECKOUT_BASE_URL || 'https://checkout.thebank.com.br';
  return `${base.replace(/\/$/, '')}/${externalProductId}`;
}
