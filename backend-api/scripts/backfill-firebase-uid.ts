/**
 * Backfill de `User.firebaseUid` a partir do e-mail.
 *
 * Roda ANTES de o FirebaseAuthGuard passar a resolver identidade por UID.
 * Enquanto um User não tiver `firebaseUid`, o login dele depende do fallback
 * por e-mail — que só vale com `email_verified === true`. Quem não casar aqui
 * e não tiver e-mail verificado perde o acesso no deploy do guard, então o
 * relatório final não é decoração: é a lista de quem precisa de ação manual.
 *
 * Idempotente: pula quem já tem `firebaseUid` gravado.
 * Dry-run por padrão — nada é escrito sem `--apply`.
 *
 * Uso (do diretório backend-api, DATABASE_URL apontando pro banco alvo):
 *   npx tsx scripts/backfill-firebase-uid.ts            # só relata
 *   npx tsx scripts/backfill-firebase-uid.ts --apply    # grava os UIDs
 *
 * Credenciais Firebase: GOOGLE_APPLICATION_CREDENTIALS,
 * scripts/firebase-service-account.json ou ./firebase-service-account.json.
 */
import { PrismaClient } from '@prisma/client';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const APPLY = process.argv.includes('--apply');

const prisma = new PrismaClient();

function initFirebase(): void {
  if (admin.apps.length) return;
  const candidates = [
    path.join(__dirname, 'firebase-service-account.json'),
    path.join(process.cwd(), 'firebase-service-account.json'),
  ];
  // GOOGLE_APPLICATION_CREDENTIALS costuma estar setada no perfil apontando
  // pra um caminho que não existe neste worktree — só honra se o arquivo estiver lá.
  const adc = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (adc && fs.existsSync(adc)) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    return;
  }
  const sa = candidates.find((p) => fs.existsSync(p));
  if (!sa) {
    throw new Error(
      `Credencial Firebase não encontrada (GOOGLE_APPLICATION_CREDENTIALS ou ${candidates.join(' ou ')})`,
    );
  }
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

type Outcome =
  | { kind: 'matched'; uid: string; emailVerified: boolean }
  | { kind: 'already' }
  | { kind: 'no-firebase-account' }
  | { kind: 'uid-taken'; uid: string; byEmail: string }
  | { kind: 'error'; message: string };

async function resolve(user: {
  id: string;
  email: string;
  firebaseUid: string | null;
}): Promise<Outcome> {
  if (user.firebaseUid) return { kind: 'already' };

  let record: admin.auth.UserRecord;
  try {
    record = await admin.auth().getUserByEmail(user.email);
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') return { kind: 'no-firebase-account' };
    return { kind: 'error', message: err?.message ?? String(err) };
  }

  // O unique index barraria isso de qualquer jeito; capturar aqui dá nome ao
  // conflito em vez de um P2002 no meio do loop.
  const owner = await prisma.user.findUnique({
    where: { firebaseUid: record.uid },
    select: { email: true },
  });
  if (owner) {
    return { kind: 'uid-taken', uid: record.uid, byEmail: owner.email };
  }

  if (APPLY) {
    await prisma.user.update({
      where: { id: user.id },
      data: { firebaseUid: record.uid },
    });
  }
  return { kind: 'matched', uid: record.uid, emailVerified: record.emailVerified };
}

async function main() {
  initFirebase();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firebaseUid: true,
      role: true,
      isActive: true,
      deletedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`=== Backfill de firebaseUid (${users.length} usuários) ===`);
  console.log(APPLY ? 'Modo: APLICANDO (--apply)\n' : 'Modo: DRY-RUN (use --apply para gravar)\n');

  const missing: typeof users = [];
  const conflicts: Array<{ email: string; uid: string; byEmail: string }> = [];
  const errors: Array<{ email: string; message: string }> = [];
  // Ficou sem UID: o login desses passa a depender do fallback por e-mail,
  // que exige `email_verified === true`. Quem não tiver, perde o acesso.
  const atRisk: string[] = [];
  let matched = 0;
  let already = 0;

  for (const user of users) {
    const outcome = await resolve(user);
    const tag = `${user.email}${user.deletedAt ? ' [DELETADO]' : ''}${user.isActive ? '' : ' [INATIVO]'}`;

    switch (outcome.kind) {
      case 'already':
        already += 1;
        console.log(`⏭️  ${tag} — já tinha firebaseUid`);
        break;
      case 'matched':
        matched += 1;
        console.log(
          `✅ ${tag} — uid ${outcome.uid.slice(0, 8)}… (email_verified: ${outcome.emailVerified})${APPLY ? '' : ' [dry-run]'}`,
        );
        break;
      case 'no-firebase-account':
        missing.push(user);
        atRisk.push(user.email);
        console.log(`⚠️  ${tag} — sem conta Firebase`);
        break;
      case 'uid-taken':
        conflicts.push({ email: user.email, uid: outcome.uid, byEmail: outcome.byEmail });
        atRisk.push(user.email);
        console.log(`❌ ${tag} — uid ${outcome.uid.slice(0, 8)}… já pertence a ${outcome.byEmail}`);
        break;
      case 'error':
        errors.push({ email: user.email, message: outcome.message });
        atRisk.push(user.email);
        console.log(`❌ ${tag} — erro: ${outcome.message}`);
        break;
    }
  }

  console.log('\n=== Relatório ===');
  console.log(`Total de usuários no banco.......: ${users.length}`);
  console.log(`Casaram com conta Firebase.......: ${matched}${APPLY ? ' (gravados)' : ' (dry-run)'}`);
  console.log(`Já tinham firebaseUid............: ${already}`);
  console.log(`Sem conta Firebase...............: ${missing.length}`);
  console.log(`Conflito de UID..................: ${conflicts.length}`);
  console.log(`Erros............................: ${errors.length}`);

  if (missing.length > 0) {
    console.log('\n-- Sem conta Firebase (não casaram) --');
    for (const u of missing) {
      console.log(`  ${u.email} (${u.role}${u.isActive ? '' : ', INATIVO'}${u.deletedAt ? ', DELETADO' : ''})`);
    }
  }
  if (conflicts.length > 0) {
    console.log('\n-- Conflito: a mesma conta Firebase para dois Users --');
    for (const c of conflicts) {
      console.log(`  ${c.email} ↔ ${c.byEmail} (uid ${c.uid})`);
    }
  }
  if (errors.length > 0) {
    console.log('\n-- Erros --');
    for (const e of errors) console.log(`  ${e.email}: ${e.message}`);
  }
  if (atRisk.length > 0) {
    console.log(
      `\n⚠️  ${atRisk.length} usuário(s) ficam dependendo do fallback por e-mail verificado.`,
    );
    console.log('   Se o e-mail não estiver verificado no Firebase, o login será negado.');
  }

  if (conflicts.length > 0 || errors.length > 0) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
