-- Permite reusar a mesma aula (mesmo r2Basename) em modulos diferentes —
-- caso de uso pedagogico: video de "Anestesia 101" usado tanto em
-- Cirurgia Abdominal quanto em Cirurgia Felina. Mantem unicidade
-- composta (basename, moduleId) pra impedir duplicar a mesma aula
-- dentro do mesmo modulo (erro de admin, nao reuso).
--
-- Materials/Captions/Quiz/Progress permanecem por-Video propositalmente:
-- cada placement do video em um modulo carrega seu proprio quiz e
-- progresso do aluno — regra pedagogica vigente.

-- DropIndex
DROP INDEX "videos_r2Basename_key";

-- CreateIndex
CREATE UNIQUE INDEX "videos_r2Basename_moduleId_key" ON "videos"("r2Basename", "moduleId");
