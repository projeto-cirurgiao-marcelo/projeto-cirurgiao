/**
 * Realinha as matrículas (Enrollment) de todos os alunos com o acesso atual
 * (entitlements). Backfill do que o webhook passou a fazer a cada
 * concessão/revogação: suspende matrículas de cursos onde o aluno não
 * alcança mais nenhuma aula e restaura as suspensas onde voltou a alcançar.
 *
 * Por que existe: Enrollment é telemetria ("começou a assistir") e nunca
 * era removida — quem perdeu acesso (revogação, ou a migração para vitrines)
 * seguia vendo o curso em "Em andamento" (handoff 2026-08-14, P3).
 *
 * Dry-run por padrão; idempotente; reversível (é um timestamp nullable).
 *
 * Uso (do backend-api, DATABASE_URL apontando pro banco alvo):
 *   npx tsx scripts/reconcile-enrollments.ts            # só lista
 *   npx tsx scripts/reconcile-enrollments.ts --apply    # grava
 *   npx tsx scripts/reconcile-enrollments.ts --user=email@x  # um aluno só
 */
import { PrismaClient, Role } from '@prisma/client';
import { AccessService } from '../src/modules/showcases/access.service';
import type { PrismaService } from '../src/shared/prisma/prisma.service';

const APPLY = process.argv.includes('--apply');
const ONLY_USER = process.argv.find((a) => a.startsWith('--user='))?.slice('--user='.length);

const prisma = new PrismaClient();
// AccessService só usa a API de query do client — PrismaService é PrismaClient + hooks de Nest.
const access = new AccessService(prisma as unknown as PrismaService);

async function main() {
  console.log(`=== Reconciliação de matrículas × acesso (${APPLY ? 'APPLY' : 'dry-run'}) ===\n`);

  const users = await prisma.user.findMany({
    where: {
      role: Role.STUDENT,
      ...(ONLY_USER ? { email: ONLY_USER } : {}),
    },
    select: { id: true, email: true },
    orderBy: { email: 'asc' },
  });

  let totalSuspend = 0;
  let totalRestore = 0;

  for (const user of users) {
    const videoAccess = await access.getAccess({ userId: user.id, role: Role.STUDENT });
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id, course: { deletedAt: null } },
      select: {
        id: true,
        suspendedAt: true,
        course: {
          select: {
            title: true,
            modules: {
              where: { deletedAt: null },
              select: {
                videos: { where: { deletedAt: null, isPublished: true }, select: { id: true } },
              },
            },
          },
        },
      },
    });

    const suspend: string[] = [];
    const restore: string[] = [];
    for (const e of enrollments) {
      const ids = e.course.modules.flatMap((m) => m.videos.map((v) => v.id));
      const level = access.courseAccessLevel(videoAccess, ids);
      if (level === 'none' && !e.suspendedAt) suspend.push(e.course.title);
      if (level !== 'none' && e.suspendedAt) restore.push(e.course.title);
    }
    if (suspend.length === 0 && restore.length === 0) continue;

    console.log(`${user.email}`);
    for (const t of suspend) console.log(`  ⏸ suspender: ${t}`);
    for (const t of restore) console.log(`  ▶ restaurar: ${t}`);
    totalSuspend += suspend.length;
    totalRestore += restore.length;

    if (APPLY) {
      const r = await access.reconcileEnrollments(user.id);
      console.log(`  → gravado: ${r.suspended} suspensas, ${r.restored} restauradas`);
    }
  }

  console.log(
    `\nAlunos analisados: ${users.length} | a suspender: ${totalSuspend} | a restaurar: ${totalRestore}` +
      (APPLY ? '' : '\n(dry-run — nada gravado; use --apply)'),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
