/**
 * Staging seed — deterministic fixtures for E2E tests (Playwright / Detox).
 *
 * Idempotent: safe to run multiple times. Every run deletes the previous
 * fixtures (scoped by well-known ids / emails) and recreates them, so
 * tests can assume the exact state on every boot.
 *
 * Guard rails:
 *   - Refuses to run when `NODE_ENV === 'production'` UNLESS
 *     `ALLOW_SEED === 'true'`. Both gates have to agree for prod —
 *     single flip is not enough.
 *   - Logs the target DATABASE_URL host:db so the operator can sanity-
 *     check where the writes are about to land.
 *
 * Usage:
 *   cd backend-api && npx ts-node prisma/seed-staging.ts
 *
 * Credentials and the full list of fixtures are documented in
 * docs/DEPLOY.md "Staging seed".
 */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// ============================================
// Deterministic ids — kept out of the random-UUID pool on purpose so
// Playwright/Detox can `goto(/courses/${SEED_COURSE_ID})` without a DB
// lookup.
// ============================================
const SEED_ADMIN_ID = '00000000-0000-4000-a000-000000000001';
const SEED_STUDENT_ID = '00000000-0000-4000-a000-000000000002';
const SEED_COURSE_ID = '00000000-0000-4000-a000-000000000010';
const SEED_MODULE_ID = '00000000-0000-4000-a000-000000000011';
const SEED_VIDEO_ID = '00000000-0000-4000-a000-000000000012';
const SEED_QUIZ_ID = '00000000-0000-4000-a000-000000000013';
const SEED_ENROLLMENT_ID = '00000000-0000-4000-a000-000000000014';

const ADMIN_EMAIL = 'admin@cirurgiao.app';
const STUDENT_EMAIL = 'test@cirurgiao.app';
// Documented password — keep in sync with docs/DEPLOY.md "Staging seed".
const ADMIN_PASSWORD = 'Seed!Admin2026';
const STUDENT_PASSWORD = 'Seed!Student2026';

// TODO: Substituir pelo master playlist real quando Gustav provisionar em R2.
const PLACEHOLDER_HLS_URL = 'https://placeholder.cirurgiao.app/test.m3u8';

function ensureNotProd() {
  const nodeEnv = process.env.NODE_ENV;
  const allow = process.env.ALLOW_SEED === 'true';
  if (nodeEnv === 'production' && !allow) {
    console.error(
      '[seed-staging] NODE_ENV=production e ALLOW_SEED!=true — abortando. Nunca rode este seed contra prod.',
    );
    process.exit(1);
  }
}

function logTarget() {
  const url = process.env.DATABASE_URL ?? '(unset)';
  // Mask password if URL-shaped.
  let safe = url;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const port = parsed.port || '5432';
    const db = parsed.pathname.replace(/^\//, '');
    safe = `${parsed.protocol}//…@${host}:${port}/${db}`;
  } catch {
    /* ignore */
  }
  console.log(`[seed-staging] Target DB: ${safe}`);
}

async function main() {
  ensureNotProd();
  logTarget();

  const prisma = new PrismaClient();

  try {
    // ============================================
    // 1. Clean previous seed fixtures. onDelete: Cascade on Course/Module
    // handles the sub-graph (modules → videos → quizzes → questions,
    // enrollments via course), but we delete explicitly for clarity and
    // to avoid surprises if the cascade rules change.
    // ============================================
    console.log('[seed-staging] Cleaning previous fixtures…');

    await prisma.quizQuestion.deleteMany({ where: { quizId: SEED_QUIZ_ID } });
    await prisma.quiz.deleteMany({ where: { id: SEED_QUIZ_ID } });
    await prisma.enrollment.deleteMany({ where: { id: SEED_ENROLLMENT_ID } });
    await prisma.video.deleteMany({ where: { id: SEED_VIDEO_ID } });
    await prisma.module.deleteMany({ where: { id: SEED_MODULE_ID } });
    await prisma.course.deleteMany({ where: { id: SEED_COURSE_ID } });
    // Delete users last — FK cascades from enrollments/modules keep them
    // safe, but ordering makes the intent explicit.
    await prisma.user.deleteMany({
      where: { id: { in: [SEED_ADMIN_ID, SEED_STUDENT_ID] } },
    });

    // ============================================
    // 2. Users — admin (instructor) + student (Playwright's login).
    // ============================================
    console.log('[seed-staging] Creating users…');

    const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const studentPasswordHash = await bcrypt.hash(STUDENT_PASSWORD, 10);

    await prisma.user.create({
      data: {
        id: SEED_ADMIN_ID,
        email: ADMIN_EMAIL,
        name: 'Seed Admin',
        password: adminPasswordHash,
        role: Role.ADMIN,
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        id: SEED_STUDENT_ID,
        email: STUDENT_EMAIL,
        name: 'Seed Student',
        password: studentPasswordHash,
        role: Role.STUDENT,
        isActive: true,
      },
    });

    // ============================================
    // 3. Course — published, slug pinned for Playwright.
    // ============================================
    console.log('[seed-staging] Creating course…');
    await prisma.course.create({
      data: {
        id: SEED_COURSE_ID,
        title: 'Curso de Teste E2E',
        slug: 'curso-teste-e2e',
        description:
          'Fixture para testes automatizados. NÃO exibir para usuários reais.',
        instructorId: SEED_ADMIN_ID,
        isPublished: true,
      },
    });

    // ============================================
    // 4. Module.
    // ============================================
    console.log('[seed-staging] Creating module…');
    await prisma.module.create({
      data: {
        id: SEED_MODULE_ID,
        title: 'Módulo de Teste',
        order: 0,
        courseId: SEED_COURSE_ID,
      },
    });

    // ============================================
    // 5. Video (r2_hls source).
    // ============================================
    console.log('[seed-staging] Creating video…');
    await prisma.video.create({
      data: {
        id: SEED_VIDEO_ID,
        title: 'Vídeo de Teste',
        description: 'Vídeo seed — hlsUrl é placeholder.',
        moduleId: SEED_MODULE_ID,
        order: 0,
        duration: 30,
        isPublished: true,
        uploadStatus: 'READY',
        uploadProgress: 100,
        videoSource: 'r2_hls',
        // TODO: swap for real master playlist once Gustav provisions R2.
        hlsUrl: PLACEHOLDER_HLS_URL,
      },
    });

    // ============================================
    // 6. Quiz — 3 MCQ questions, 70% passing score.
    // ============================================
    console.log('[seed-staging] Creating quiz…');
    await prisma.quiz.create({
      data: {
        id: SEED_QUIZ_ID,
        videoId: SEED_VIDEO_ID,
        title: 'Quiz do Vídeo de Teste',
        description: 'Quiz determinístico para E2E.',
        difficulty: 'MEDIUM',
        passingScore: 70,
      },
    });

    await prisma.quizQuestion.createMany({
      data: [
        {
          id: '00000000-0000-4000-a000-000000000101',
          quizId: SEED_QUIZ_ID,
          question: 'Qual é a cor do céu em um dia claro?',
          options: ['Verde', 'Vermelho', 'Azul', 'Amarelo'],
          correctAnswer: 2,
          explanation: 'Rayleigh scattering espalha mais a luz azul.',
          order: 0,
          points: 10,
        },
        {
          id: '00000000-0000-4000-a000-000000000102',
          quizId: SEED_QUIZ_ID,
          question: 'Quantos dedos tem uma mão humana padrão?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 2,
          explanation: 'Cinco dedos, incluindo o polegar.',
          order: 1,
          points: 10,
        },
        {
          id: '00000000-0000-4000-a000-000000000103',
          quizId: SEED_QUIZ_ID,
          question: 'Qual animal é o melhor amigo do homem?',
          options: ['Gato', 'Cachorro', 'Papagaio', 'Peixe'],
          correctAnswer: 1,
          explanation: 'Referência cultural padrão.',
          order: 2,
          points: 10,
        },
      ],
    });

    // ============================================
    // 7. Enrollment — student matriculado no curso.
    // ============================================
    console.log('[seed-staging] Creating enrollment…');
    await prisma.enrollment.create({
      data: {
        id: SEED_ENROLLMENT_ID,
        userId: SEED_STUDENT_ID,
        courseId: SEED_COURSE_ID,
        progress: 0,
      },
    });

    console.log('[seed-staging] Done.');
    console.log(`  admin:   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log(`  student: ${STUDENT_EMAIL} / ${STUDENT_PASSWORD}`);
    console.log(`  course slug: curso-teste-e2e (id: ${SEED_COURSE_ID})`);
    console.log(`  video id:    ${SEED_VIDEO_ID}`);
    console.log(`  quiz id:     ${SEED_QUIZ_ID}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[seed-staging] Failed:', err);
  process.exit(1);
});
