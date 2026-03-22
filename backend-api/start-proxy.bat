@echo off
REM ============================================
REM  Cloud SQL Auth Proxy - Desenvolvimento Local
REM  Projeto Cirurgiao
REM ============================================
REM
REM  Prerequisitos:
REM    1. gcloud auth application-default login (executar uma vez)
REM    2. cloud-sql-proxy instalado
REM
REM  Uso:
REM    Abra este script ANTES de iniciar o backend (npm run start:dev)
REM    Mantenha este terminal aberto enquanto desenvolve
REM
REM  IMPORTANTE: Usa porta 5433 (nao 5432) para nao conflitar
REM  com PostgreSQL local. Atualize DATABASE_URL no .env:
REM    DATABASE_URL="postgresql://app_cirurgiao:SENHA@localhost:5433/projeto_cirurgiao"
REM
REM ============================================

echo.
echo [Cloud SQL Proxy] Iniciando conexao com cirurgiao-db na porta 5433...
echo [Cloud SQL Proxy] Atualize o .env para usar localhost:5433
echo [Cloud SQL Proxy] Pressione Ctrl+C para parar
echo.

cloud-sql-proxy projeto-cirurgiao-e8df7:southamerica-east1:cirurgiao-db --port=5433

echo.
echo [Cloud SQL Proxy] Proxy encerrado.
pause
