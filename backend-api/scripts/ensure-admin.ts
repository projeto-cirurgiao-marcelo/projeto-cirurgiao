/**
 * Garante uma conta ADMIN funcional no Firebase Auth + PostgreSQL.
 *
 * Resolve o cenário "admin sem senha conhecida / recriado no console":
 *   - Firebase: cria o usuário se não existir; define a senha informada.
 *   - Postgres: cria o User (role ADMIN, ativo) se não existir; promove a
 *     ADMIN se for outro papel; grava/corrige `firebaseUid` com o UID atual
 *     do Firebase (excluir e recriar no console muda o UID, e o backend
 *     recusa token cujo UID não bate com o gravado).
 *
 * Idempotente. Dry-run por padrão — nada é escrito sem `--apply`.
 *
 * Uso (do diretório backend-api, DATABASE_URL apontando pro banco alvo):
 *   ADMIN_PASSWORD='...' npx tsx scripts/ensure-admin.ts --email admin@x.app          # só relata
 *   ADMIN_PASSWORD='...' npx tsx scripts/ensure-admin.ts --email admin@x.app --apply  # grava
 *
 * A senha vem SÓ da env ADMIN_PASSWORD (nunca por argumento, pra não ficar
 * no histórico do shell). Sem ela o script não mexe na senha de quem já existe.
 *
 * Credenciais Firebase: GOOGLE_APPLICATION_CREDENTIALS, ADC do gcloud
 * (`gcloud auth application-default login`) ou scripts/firebase-service-account.json.
 */
import { PrismaClient, Role } from '@prisma/client';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const APPLY = process.argv.includes('--apply');
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'projeto-cirurgiao-e8df7';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const email = arg('email')?.trim().toLowerCase();
const name = arg('name')?.trim() || 'Administrador';
const password = process.env.ADMIN_PASSWORD;

if (!email || !email.includes('@')) {
  console.error('Uso: ADMIN_PASSWORD=... npx tsx scripts/ensure-admin.ts --email <email> [--name "Nome"] [--apply]');
  process.exit(1);
}
if (password !== undefined && password.length < 8) {
  console.error('ADMIN_PASSWORD precisa ter pelo menos 8 caracteres');
  process.exit(1);
}

const prisma = new PrismaClient();

function initFirebase(): void {
  if (admin.apps.length) return;
  const local = [
    path.join(__dirname, 'firebase-service-account.json'),
    path.join(process.cwd(), 'firebase-service-account.json'),
  ].find((p) => fs.existsSync(p));
  const adc = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (adc && fs.existsSync(adc)) {
    admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  } else if (local) {
    admin.initializeApp({ credential: admin.credential.cert(local), projectId: PROJECT_ID });
  } else {
    // ADC do gcloud (gcloud auth application-default login)
    admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  }
}

async function main() {
  initFirebase();
  console.log(`=== ensure-admin: ${email} (projeto ${PROJECT_ID}) — ${APPLY ? 'APPLY' : 'DRY-RUN'} ===\n`);
  const actions: string[] = [];

  // --- Firebase ---
  let fbUser: admin.auth.UserRecord | null = null;
  try {
    fbUser = await admin.auth().getUserByEmail(email!);
    console.log(`Firebase: existe (uid ${fbUser.uid}, disabled=${fbUser.disabled})`);
  } catch {
    console.log('Firebase: NÃO existe');
  }

  if (!fbUser) {
    if (!password) {
      console.error('Firebase: usuário não existe e ADMIN_PASSWORD não foi informada — nada a fazer.');
      process.exit(1);
    }
    actions.push('criar usuário no Firebase com a senha informada');
    if (APPLY) {
      fbUser = await admin.auth().createUser({ email: email!, password, displayName: name, emailVerified: true });
      console.log(`  → criado (uid ${fbUser.uid})`);
    }
  } else {
    const update: admin.auth.UpdateRequest = {};
    if (password) update.password = password;
    if (fbUser.disabled) update.disabled = false;
    if (!fbUser.emailVerified) update.emailVerified = true;
    if (Object.keys(update).length) {
      actions.push(`atualizar no Firebase: ${Object.keys(update).join(', ')}`);
      if (APPLY) {
        fbUser = await admin.auth().updateUser(fbUser.uid, update);
        console.log('  → atualizado');
      }
    }
  }
  const uid = fbUser?.uid ?? '<uid gerado no apply>';

  // --- Postgres ---
  const pg = await prisma.user.findUnique({ where: { email: email! } });
  if (!pg) {
    console.log('Postgres: NÃO existe');
    actions.push('criar User ADMIN ativo no Postgres com firebaseUid');
    if (APPLY && fbUser) {
      await prisma.user.create({
        data: {
          email: email!,
          name,
          password: `firebase:${crypto.randomBytes(8).toString('hex')}`, // login é via Firebase
          role: Role.ADMIN,
          isActive: true,
          firebaseUid: fbUser.uid,
        },
      });
      console.log('  → criado');
    }
  } else {
    console.log(
      `Postgres: existe (id ${pg.id}, role ${pg.role}, active=${pg.isActive}, firebaseUid=${pg.firebaseUid ?? 'null'}, deletedAt=${pg.deletedAt ?? 'null'})`,
    );
    const data: Record<string, unknown> = {};
    if (pg.role !== Role.ADMIN) data.role = Role.ADMIN;
    if (!pg.isActive) data.isActive = true;
    if (pg.deletedAt) data.deletedAt = null;
    if (fbUser && pg.firebaseUid !== fbUser.uid) data.firebaseUid = fbUser.uid;
    if (Object.keys(data).length) {
      actions.push(`atualizar no Postgres: ${Object.keys(data).join(', ')}`);
      if (APPLY) {
        if (data.firebaseUid) {
          // Outro User pode estar segurando esse UID (unique) — solta antes.
          await prisma.user.updateMany({
            where: { firebaseUid: data.firebaseUid as string, NOT: { id: pg.id } },
            data: { firebaseUid: null },
          });
        }
        await prisma.user.update({ where: { id: pg.id }, data });
        console.log('  → atualizado');
      }
    }
  }

  console.log('');
  if (!actions.length) {
    console.log('Nada a fazer: admin já consistente.');
  } else {
    console.log(`${APPLY ? 'Ações aplicadas' : 'Ações pendentes (rode com --apply)'}:`);
    for (const a of actions) console.log(`  - ${a}`);
  }
  console.log(`\nUID Firebase: ${uid}`);
}

main()
  .catch((err) => {
    console.error('Falhou:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
