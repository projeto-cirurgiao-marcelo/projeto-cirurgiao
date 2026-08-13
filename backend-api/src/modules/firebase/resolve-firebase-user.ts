import { Logger } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';
import { PrismaService } from '../../shared/prisma/prisma.service';

/**
 * Resolve o User do Postgres a partir de um token Firebase já verificado.
 *
 * `firebaseUid` é a identidade canônica. O fallback por e-mail existe só
 * enquanto houver User sem UID gravado (ver scripts/backfill-firebase-uid.ts)
 * e exige `email_verified === true` — sem isso, criar uma conta Firebase com
 * o e-mail de um admin daria o User admin de brinde.
 *
 * Um único ponto de resolução de propósito: guard e firebaseLogin são portas
 * equivalentes, e a regra divergir entre as duas é como o vetor volta.
 */
export async function resolveFirebaseUser(
  prisma: PrismaService,
  decodedToken: DecodedIdToken,
  logger: Logger,
) {
  const byUid = await prisma.user.findUnique({
    where: { firebaseUid: decodedToken.uid },
  });
  if (byUid) return byUid;

  if (!decodedToken.email) return null;

  const byEmail = await prisma.user.findUnique({
    where: { email: decodedToken.email },
  });
  if (!byEmail) return null;

  // Já tem outro UID gravado: e-mail igual, conta Firebase diferente.
  if (byEmail.firebaseUid) {
    logger.warn(
      `Token Firebase (uid ${decodedToken.uid.slice(0, 8)}…) com e-mail de User já vinculado a outro uid: ${redactEmail(byEmail.email)}`,
    );
    return null;
  }

  if (decodedToken.email_verified !== true) {
    logger.warn(
      `Login negado: User sem firebaseUid e e-mail não verificado — ${redactEmail(byEmail.email)}`,
    );
    return null;
  }

  // Salvaguarda temporária: enxergar quem ainda depende do fallback antes
  // de endurecê-lo (remover o caminho por e-mail).
  logger.warn(`Identidade resolvida por fallback de e-mail verificado: ${redactEmail(byEmail.email)}`);

  // Primeiro login bem-sucedido grava o UID — a partir daqui esse User não
  // passa mais pelo fallback. Falha aqui não derruba o login.
  try {
    return await prisma.user.update({
      where: { id: byEmail.id },
      data: { firebaseUid: decodedToken.uid },
    });
  } catch (err) {
    logger.warn(
      `Não foi possível gravar firebaseUid de ${redactEmail(byEmail.email)}: ${err instanceof Error ? err.message : err}`,
    );
    return byEmail;
  }
}

/** g***@gmail.com — o suficiente pra reconhecer no log sem despejar o e-mail. */
export function redactEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
}
