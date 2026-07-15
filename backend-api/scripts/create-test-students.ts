/**
 * Cria os alunos do teste fechado (acesso por convite) no Firebase Auth +
 * PostgreSQL e, opcionalmente, dispara o e-mail de definição de senha
 * (template "Password reset" do Firebase Console — funciona como convite:
 * aluno clica no link, define a própria senha e loga em /login).
 *
 * Idempotente: pula quem já existe no Firebase e/ou no Postgres.
 * A senha inicial do Firebase é aleatória e NUNCA é exibida/enviada —
 * o aluno só consegue entrar depois de definir a dele pelo link.
 *
 * Uso (do diretório backend-api, DATABASE_URL apontando pro banco alvo):
 *   npx tsx scripts/create-test-students.ts              # só cria as contas
 *   npx tsx scripts/create-test-students.ts --send-invites  # cria + envia e-mails
 *
 * Credenciais: GOOGLE_APPLICATION_CREDENTIALS ou scripts/firebase-service-account.json.
 * Envio de e-mail exige FIREBASE_API_KEY no ambiente (mesma key do backend).
 */
import { PrismaClient } from '@prisma/client';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const TEST_STUDENT_EMAILS = [
  'lucas.aquinor@gmail.com',
  'vetanalidia@gmail.com',
  'tbrmv@hotmail.com',
  'dra.lucimarazanolla@gmail.com',
  'victorthepitdog@hotmail.com',
  'alejandrabarrera.ufrgs@yahoo.com',
  'alanavet88@gmail.com',
  'carolinapf.sousa@gmail.com',
  'estherscs17@gmail.com',
  'mhveterinario@gmail.com',
  'mvpinsan@gmail.com',
  'mv.lahissampaio@gmail.com',
  'vbeckenkamp728@gmail.com',
  'agropecuariadiamante@outlook.com',
  'rayanne_mirelly@outlook.com',
  'monteirorayanne95@gmail.com',
  'anapaulacvp@hotmail.com',
  'rocha.danielle77@gmail.com',
];

const SEND_INVITES = process.argv.includes('--send-invites');

const prisma = new PrismaClient();

function initFirebase(): void {
  if (admin.apps.length) return;
  const localSa = path.join(__dirname, 'firebase-service-account.json');
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  } else if (fs.existsSync(localSa)) {
    admin.initializeApp({ credential: admin.credential.cert(localSa) });
  } else {
    throw new Error(
      'Credencial Firebase não encontrada (GOOGLE_APPLICATION_CREDENTIALS ou scripts/firebase-service-account.json)',
    );
  }
}

/** "dra.lucimarazanolla" -> "Dra Lucimarazanolla" (aluno ajusta no perfil) */
function nameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .split(/[._\-\d]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

async function ensureFirebaseUser(email: string, name: string): Promise<string> {
  try {
    const existing = await admin.auth().getUserByEmail(email);
    return `já existia (uid ${existing.uid.slice(0, 8)}…)`;
  } catch {
    const created = await admin.auth().createUser({
      email,
      displayName: name,
      // Senha descartável — o aluno define a dele pelo link do e-mail.
      password: crypto.randomBytes(24).toString('base64url'),
    });
    return `criado (uid ${created.uid.slice(0, 8)}…)`;
  }
}

async function ensurePostgresUser(email: string, name: string): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return `já existia (${existing.role}${existing.isActive ? '' : ', INATIVO'})`;
  }
  await prisma.user.create({
    data: {
      email,
      name,
      password: '', // Firebase gerencia a senha
      role: 'STUDENT',
      isActive: true,
    },
  });
  return 'criado (STUDENT)';
}

/** Mesmo endpoint que o backend usa no forgot-password (firebase-admin.service.ts) */
async function sendPasswordSetupEmail(email: string): Promise<void> {
  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error('FIREBASE_API_KEY não definida — necessária pra enviar os e-mails');
  }
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`sendOobCode ${res.status}: ${body.slice(0, 200)}`);
  }
}

async function main() {
  initFirebase();
  console.log(`=== Alunos do teste fechado (${TEST_STUDENT_EMAILS.length}) ===`);
  console.log(`Envio de convites: ${SEND_INVITES ? 'SIM (--send-invites)' : 'não (só criação)'}\n`);

  let failures = 0;
  for (const email of TEST_STUDENT_EMAILS) {
    const name = nameFromEmail(email);
    try {
      const fb = await ensureFirebaseUser(email, name);
      const pg = await ensurePostgresUser(email, name);
      let invite = '';
      if (SEND_INVITES) {
        await sendPasswordSetupEmail(email);
        invite = ' | convite enviado';
      }
      console.log(`✅ ${email} — firebase: ${fb} | postgres: ${pg}${invite}`);
    } catch (err) {
      failures += 1;
      console.error(`❌ ${email} — ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nConcluído. Falhas: ${failures}`);
  if (failures > 0) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
