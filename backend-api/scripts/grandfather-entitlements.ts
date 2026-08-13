/**
 * Grandfather — acesso total pros usuários que existiam antes do gate.
 *
 * Cria a vitrine `Acesso completo (legado)` (grantsAllContent = true) e um
 * `Entitlement` por usuário vivo com `source = GRANDFATHER` e
 * `expiresAt = null` (vitalício). Roda ANTES de o gate de leitura entrar no
 * ar: com todo mundo liberado, um erro de composição de vitrine aparece como
 * "aula deveria estar bloqueada e não está" — falha benigna, nunca aluno
 * pagante trancado do lado de fora.
 *
 * Idempotente: vitrine é resolvida por slug; entitlement existente
 * (@@unique userId+showcaseId) é pulado — inclusive os revogados, que um
 * admin revogou de propósito e este script não ressuscita.
 * Dry-run por padrão — nada é escrito sem `--apply`.
 *
 * Uso (do diretório backend-api, DATABASE_URL apontando pro banco alvo):
 *   npx tsx scripts/grandfather-entitlements.ts            # só relata
 *   npx tsx scripts/grandfather-entitlements.ts --apply    # grava
 */
import { PrismaClient } from '@prisma/client';

const APPLY = process.argv.includes('--apply');

const SHOWCASE_SLUG = 'acesso-completo-legado';
const SHOWCASE_TITLE = 'Acesso completo (legado)';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Grandfather de Entitlements ===');
  console.log(APPLY ? 'Modo: APLICANDO (--apply)\n' : 'Modo: DRY-RUN (use --apply para gravar)\n');

  const showcase = await prisma.showcase.findUnique({
    where: { slug: SHOWCASE_SLUG },
    select: { id: true, title: true, grantsAllContent: true, deletedAt: true },
  });

  if (showcase && !showcase.grantsAllContent) {
    // Slug ocupado por uma vitrine comum: gravar aqui daria "acesso total"
    // que não libera nada. Resolver manualmente antes de rodar de novo.
    console.error(
      `❌ A vitrine "${showcase.title}" (slug ${SHOWCASE_SLUG}) existe mas NÃO tem grantsAllContent. Abortando.`,
    );
    process.exitCode = 1;
    return;
  }
  if (showcase?.deletedAt) {
    console.error(
      `❌ A vitrine "${showcase.title}" existe mas está arquivada. Restaure antes de rodar.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    showcase
      ? `✅ Vitrine já existe: "${showcase.title}" (${showcase.id})`
      : `➕ Vitrine "${SHOWCASE_TITLE}" será criada${APPLY ? '' : ' [dry-run]'}`,
  );

  // Deletados não logam e ficariam com direito fantasma; inativos entram —
  // reativação de conta não deve exigir rodar isto de novo.
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, email: true, role: true, isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const existing = showcase
    ? await prisma.entitlement.findMany({
        where: { showcaseId: showcase.id },
        select: { userId: true, revokedAt: true, source: true },
      })
    : [];
  const byUser = new Map(existing.map((e) => [e.userId, e]));

  const toGrant: typeof users = [];
  let already = 0;
  let revokedKept = 0;
  let inactive = 0;

  for (const user of users) {
    if (!user.isActive) inactive += 1;
    const current = byUser.get(user.id);
    if (!current) {
      toGrant.push(user);
      console.log(`➕ ${user.email} (${user.role}${user.isActive ? '' : ', INATIVO'}) — ganha GRANDFATHER${APPLY ? '' : ' [dry-run]'}`);
    } else if (current.revokedAt) {
      revokedKept += 1;
      console.log(`🚫 ${user.email} — entitlement REVOGADO existente, mantido como está`);
    } else {
      already += 1;
      console.log(`⏭️  ${user.email} — já tinha (source: ${current.source})`);
    }
  }

  if (APPLY) {
    await prisma.$transaction(async (tx) => {
      const target =
        showcase ??
        (await tx.showcase.create({
          data: {
            title: SHOWCASE_TITLE,
            slug: SHOWCASE_SLUG,
            description:
              'Acesso total do cohort pré-gate (migração 2026-08). Não vender: sem produto TheMembers vinculado.',
            grantsAllContent: true,
            isPublished: false,
          },
          select: { id: true, title: true, grantsAllContent: true, deletedAt: true },
        }));

      await tx.entitlement.createMany({
        data: toGrant.map((u) => ({
          userId: u.id,
          showcaseId: target.id,
          source: 'GRANDFATHER' as const,
          expiresAt: null,
        })),
        skipDuplicates: true,
      });
    });
  }

  console.log('\n=== Relatório ===');
  console.log(`Usuários vivos no banco..........: ${users.length}`);
  console.log(`Ganharam GRANDFATHER.............: ${toGrant.length}${APPLY ? ' (gravados)' : ' (dry-run)'}`);
  console.log(`Já tinham entitlement............: ${already}`);
  console.log(`Revogados (mantidos revogados)...: ${revokedKept}`);
  console.log(`Inativos (receberam mesmo assim).: ${inactive}`);
  console.log(`Vitrine..........................: ${showcase ? 'existente' : APPLY ? 'criada' : 'seria criada'}`);

  if (revokedKept > 0) {
    console.log(
      '\n⚠️  Entitlements revogados não foram ressuscitados — se algum deles deve voltar, é ação manual do admin.',
    );
  }
}

main().finally(() => prisma.$disconnect());
