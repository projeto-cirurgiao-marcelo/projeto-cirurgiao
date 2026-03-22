@echo off
REM ============================================
REM  Prisma Migrate Deploy - Producao (Cloud SQL)
REM  Projeto Cirurgiao
REM ============================================
REM
REM  Executa: npx prisma migrate deploy
REM  Via: Cloud Run Job com Unix Socket
REM  Usuario: postgres (superuser - necessario para DDL)
REM
REM  Uso:
REM    Execute este script apos criar novas migracoes:
REM      1. npx prisma migrate dev --name nova_feature  (local)
REM      2. git push (CI/CD builda nova imagem)
REM      3. Execute este script para aplicar em producao
REM
REM ============================================

echo.
echo [Migrations] Executando migracoes em producao...
echo [Migrations] Job: run-migrations (Cloud Run)
echo.

gcloud run jobs execute run-migrations --region=southamerica-east1 --project=projeto-cirurgiao-e8df7 --wait

echo.
echo [Migrations] Concluido!
pause
