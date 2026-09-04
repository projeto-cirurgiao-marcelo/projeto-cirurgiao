-- Enrollment.suspendedAt: matrícula congelada quando o aluno perde todo o
-- acesso ao curso (revogação/expiração de entitlement). Preserva progresso;
-- listagens ignoram linhas com suspendedAt preenchido.
ALTER TABLE "enrollments" ADD COLUMN "suspendedAt" TIMESTAMP(3);
