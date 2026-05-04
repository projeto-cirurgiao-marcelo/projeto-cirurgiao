import { PrismaClient, Difficulty } from '@prisma/client';

const prisma = new PrismaClient();

const SPECIALTIES = [
  { slug: 'cardiologia',         name: 'Cardiologia',           icon: 'heart',   difficulty: Difficulty.MEDIUM, displayOrder: 1 },
  { slug: 'ortopedia',           name: 'Ortopedia',             icon: 'bone',    difficulty: Difficulty.HARD,   displayOrder: 2 },
  { slug: 'partes-moles',        name: 'Partes Moles',          icon: 'scalpel', difficulty: Difficulty.MEDIUM, displayOrder: 3 },
  { slug: 'oftalmologia',        name: 'Oftalmologia',          icon: 'eye',     difficulty: Difficulty.MEDIUM, displayOrder: 4 },
  { slug: 'neurologia',          name: 'Neurologia',            icon: 'brain',   difficulty: Difficulty.HARD,   displayOrder: 5 },
  { slug: 'anestesia',           name: 'Anestesia',             icon: 'syringe', difficulty: Difficulty.HARD,   displayOrder: 6 },
  { slug: 'diagnostico-imagem',  name: 'Diagnóstico por Imagem',icon: 'scan',    difficulty: Difficulty.MEDIUM, displayOrder: 7 },
  { slug: 'reproducao',          name: 'Reprodução',            icon: 'dna',     difficulty: Difficulty.MEDIUM, displayOrder: 8 },
];

const XP_RULE_DEFAULT = {
  key: 'quiz_question',
  description: 'XP per question — base × combo × confidence',
  baseXp: 0,
  multiplierJson: {
    base: { EASY: 10, MEDIUM: 15, HARD: 25 },
    combo: [
      { min: 0,  max: 2,   mult: 1.0 },
      { min: 3,  max: 5,   mult: 1.2 },
      { min: 6,  max: 9,   mult: 1.5 },
      { min: 10, max: 999, mult: 2.0 },
    ],
    confidence: {
      GUESSED:      1.0,
      THOUGHT_KNEW: 1.05,
      KNEW:         1.15,
      MASTERED:     1.30,
    },
    errorXp: 0,
    aggregate: { pass: 50, perfect: 75, streak_save: 25 },
  },
  active: true,
};

async function main() {
  console.log('Seeding specialties...');
  for (const s of SPECIALTIES) {
    await prisma.specialty.upsert({
      where: { slug: s.slug },
      update: { name: s.name, icon: s.icon, difficulty: s.difficulty, displayOrder: s.displayOrder, active: true },
      create: { ...s, description: null, active: true },
    });
    console.log(`  ✓ ${s.slug}`);
  }

  console.log('Seeding default XP rule...');
  await prisma.xpRule.upsert({
    where: { key: XP_RULE_DEFAULT.key },
    update: {
      description: XP_RULE_DEFAULT.description,
      baseXp: XP_RULE_DEFAULT.baseXp,
      multiplierJson: XP_RULE_DEFAULT.multiplierJson,
      active: XP_RULE_DEFAULT.active,
    },
    create: XP_RULE_DEFAULT,
  });
  console.log(`  ✓ ${XP_RULE_DEFAULT.key}`);

  console.log('Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
