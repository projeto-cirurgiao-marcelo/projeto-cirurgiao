/**
 * Utilities para mascarar PII em logs.
 *
 * Uso típico:
 *   logger.log({ ...user, email: maskEmail(user.email) });
 *
 * Nunca logamos email cru, mesmo via `logger.log` gated — risco de
 * vazamento via screenshot/log-paste + compliance LGPD.
 */

/**
 * Mascara um endereço de email preservando a primeira letra do local
 * e o domínio inteiro. Retorna `'***'` se o input for malformado.
 *
 * @example
 *   maskEmail('gustavo@cirurgiao.app')  // 'g***@cirurgiao.app'
 *   maskEmail('x@y')                    // 'x***@y'
 *   maskEmail('not-an-email')           // '***'
 *   maskEmail('')                       // '***'
 */
export const maskEmail = (email: string): string => {
  if (!email) return '***';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local[0]}***@${domain}`;
};
