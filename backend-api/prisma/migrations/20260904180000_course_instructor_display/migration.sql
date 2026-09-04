-- Course.instructorName / instructorTitle: nome e cargo do professor SÓ pra
-- exibição. instructorId continua sendo a conta dona do curso (o admin);
-- os professores não têm conta na plataforma.
ALTER TABLE "courses" ADD COLUMN "instructorName" TEXT;
ALTER TABLE "courses" ADD COLUMN "instructorTitle" TEXT;
