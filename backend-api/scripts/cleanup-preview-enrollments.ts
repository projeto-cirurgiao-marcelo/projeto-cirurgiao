/**
 * Limpeza dos Enrollment/Progress criados pelo bug do preview (leva 2.5).
 *
 * Entre o deploy do gate (2026-08-12, rev 00105) e o fix, assistir preview de
 * aula NÃO comprada salvava progresso e criava Enrollment — "Meus cursos" e
 * "Em progresso" enchiam de curso não comprado. Este script remove:
 *
 *   - Progress de vídeo ao qual o usuário NÃO tem acesso (regra do gate:
 *     entitlement ativo em vitrine que contém o vídeo, ou grantsAllContent),
 *     criado a partir de --since;
 *   - Enrollment criado a partir de --since que, após a limpeza acima, fica
 *     sem NENHUM progresso no curso;
 *   - e recalcula enrollment.progress dos mantidos que perderam linhas.
 *
 * O corte por data existe porque acesso revogado ≠ preview: progresso
 * anterior ao gate é histórico legítimo (ex.: grandfather revogado depois)
 * e NÃO deve sumir — se a pessoa recomprar, o progresso volta a valer.
 *
 * Idempotente: segunda execução não encontra nada. ADMIN/INSTRUCTOR têm
 * acesso total por role e são pulados, como no gate.
 * Dry-run por padrão — nada é escrito sem `--apply`.
 *
 * Uso (do diretório backend-api, DATABASE_URL apontando pro banco alvo):
 *   npx tsx scripts/cleanup-preview-enrollments.ts                       # só relata
 *   npx tsx scripts/cleanup-preview-enrollments.ts --since=2026-08-12    # cutoff custom
 *   npx tsx scripts/cleanup-preview-enrollments.ts --apply               # grava
 */
import { PrismaClient } from '@prisma/client';

const APPLY = process.argv.includes('--apply');
const sinceArg = process.argv.find((a) => a.startsWith('--since='))?.slice('--since='.length);
// Default: dia do deploy do gate em produção (00105-rl5). Antes disso o
// preview não existia, logo nada anterior pode ter vindo do bug.
const SINCE = new Date(sinceArg ?? '2026-08-12T00:00:00-03:00');

if (Number.isNaN(SINCE.getTime())) {
  console.error(`❌ --since inválido: ${sinceArg}`);
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('=== Limpeza de Enrollment/Progress de preview ===');
  console.log(`Cutoff (--since): ${SINCE.toISOString()}`);
  console.log(APPLY ? 'Modo: APLICANDO (--apply)\n' : 'Modo: DRY-RUN (use --apply para gravar)\n');

  const users = await prisma.user.findMany({
    where: { deletedAt: null, role: { notIn: ['ADMIN', 'INSTRUCTOR'] } },
    select: { id: true, email: true },
    orderBy: { createdAt: 'asc' },
  });

  let totalProgress = 0;
  let totalEnrollments = 0;
  let totalRecalced = 0;
  let usersAffected = 0;

  for (const user of users) {
    // Mesma regra de acesso do AccessService.getAccess
    const ents = await prisma.entitlement.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        showcase: {
          select: { grantsAllContent: true, videos: { select: { videoId: true } } },
        },
      },
    });
    if (ents.some((e) => e.showcase.grantsAllContent)) continue; // acesso total, nada indevido
    const accessible = new Set(ents.flatMap((e) => e.showcase.videos.map((v) => v.videoId)));

    const progress = await prisma.progress.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        videoId: true,
        completed: true,
        createdAt: true,
        video: { select: { title: true, module: { select: { courseId: true } } } },
      },
    });

    const toDelete = progress.filter(
      (p) => !accessible.has(p.videoId) && p.createdAt >= SINCE,
    );
    if (toDelete.length === 0) continue;

    const kept = progress.filter((p) => !toDelete.includes(p));
    const keptByCourse = new Map<string, number>();
    for (const p of kept) {
      const c = p.video.module.courseId;
      keptByCourse.set(c, (keptByCourse.get(c) ?? 0) + 1);
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      select: { id: true, courseId: true, enrolledAt: true, course: { select: { title: true } } },
    });
    const dropEnrollments = enrollments.filter(
      (e) => e.enrolledAt >= SINCE && (keptByCourse.get(e.courseId) ?? 0) === 0,
    );

    // Mantidos que perderam linhas precisam de recálculo do %
    const touchedCourses = new Set(toDelete.map((p) => p.video.module.courseId));
    const recalc = enrollments.filter(
      (e) => touchedCourses.has(e.courseId) && !dropEnrollments.includes(e),
    );

    usersAffected += 1;
    totalProgress += toDelete.length;
    totalEnrollments += dropEnrollments.length;
    totalRecalced += recalc.length;

    console.log(`\n👤 ${user.email}`);
    for (const p of toDelete) {
      console.log(`   🗑️  Progress: "${p.video.title}" (${p.createdAt.toISOString().slice(0, 16)})${APPLY ? '' : ' [dry-run]'}`);
    }
    for (const e of dropEnrollments) {
      console.log(`   🗑️  Enrollment: "${e.course.title}"${APPLY ? '' : ' [dry-run]'}`);
    }
    for (const e of recalc) {
      console.log(`   ♻️  Recalcular %: "${e.course.title}"`);
    }

    if (APPLY) {
      await prisma.$transaction(async (tx) => {
        await tx.progress.deleteMany({ where: { id: { in: toDelete.map((p) => p.id) } } });
        await tx.enrollment.deleteMany({
          where: { id: { in: dropEnrollments.map((e) => e.id) } },
        });
        // Mesma semântica do updateEnrollmentProgress do ProgressService
        for (const e of recalc) {
          const courseVideoIds = (
            await tx.video.findMany({
              where: { module: { courseId: e.courseId } },
              select: { id: true },
            })
          ).map((v) => v.id);
          if (courseVideoIds.length === 0) continue;
          const completedCount = await tx.progress.count({
            where: { userId: user.id, videoId: { in: courseVideoIds }, completed: true },
          });
          const pct = Math.round((completedCount / courseVideoIds.length) * 100);
          await tx.enrollment.update({
            where: { id: e.id },
            data: { progress: pct, completedAt: pct === 100 ? undefined : null },
          });
        }
      });
    }
  }

  console.log('\n=== Relatório ===');
  console.log(`Usuários analisados (não-admin)....: ${users.length}`);
  console.log(`Usuários afetados..................: ${usersAffected}`);
  console.log(`Progress indevidos.................: ${totalProgress}${APPLY ? ' (removidos)' : ' (dry-run)'}`);
  console.log(`Enrollments indevidos..............: ${totalEnrollments}${APPLY ? ' (removidos)' : ' (dry-run)'}`);
  console.log(`Enrollments com % recalculado......: ${totalRecalced}`);
}

main().finally(() => prisma.$disconnect());
