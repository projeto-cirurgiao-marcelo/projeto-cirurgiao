# Deploy Backend API → Cloud Run (com migration job + safety net no startup)
# Execute do diretorio backend-api.
#
# Pipeline:
#   1) Build da imagem no Cloud Build → push pro Artifact Registry
#   2) Cria/atualiza Cloud Run Job `cirurgiao-api-migrator` com a nova imagem
#   3) Executa o Job e espera completar (rollback do deploy se falhar)
#   4) Deploya nova revision do service `projeto-cirurgiao-api`
#
# O Dockerfile tambem roda `prisma migrate deploy` no startup como fallback
# caso alguem bypasse este script. Ambos sao idempotentes; advisory lock
# do Prisma serializa execucoes concorrentes.

$ErrorActionPreference = "Stop"

$PROJECT      = "projeto-cirurgiao-e8df7"
$REGION       = "southamerica-east1"
$REPO         = "cirurgiao-api"
$IMAGE_NAME   = "api"
$IMAGE_TAG    = "latest"
$IMAGE        = "$REGION-docker.pkg.dev/$PROJECT/$REPO/${IMAGE_NAME}:$IMAGE_TAG"
$SERVICE      = "projeto-cirurgiao-api"
$JOB          = "cirurgiao-api-migrator"
$SQL_INSTANCE = "${PROJECT}:${REGION}:cirurgiao-db"
$VPC          = "cloud-run-connector"
$SA           = "81746498042-compute@developer.gserviceaccount.com"

Write-Host "=== Deploy backend ($SERVICE) ===" -ForegroundColor Cyan
Write-Host ""

# 1) Habilitar APIs (idempotente)
Write-Host "1. Habilitando APIs..." -ForegroundColor Yellow
gcloud services enable artifactregistry.googleapis.com --project=$PROJECT
gcloud services enable cloudbuild.googleapis.com --project=$PROJECT
gcloud services enable run.googleapis.com --project=$PROJECT
if ($LASTEXITCODE -ne 0) { Write-Host "Erro habilitando APIs" -ForegroundColor Red; exit 1 }
Write-Host "OK." -ForegroundColor Green

# 2) Criar repositorio (idempotente)
Write-Host "`n2. Garantindo repositorio Artifact Registry..." -ForegroundColor Yellow
gcloud artifacts repositories create $REPO `
    --repository-format=docker `
    --location=$REGION `
    --description="Repositorio Docker para API do Cirurgiao" `
    --project=$PROJECT 2>$null
Write-Host "OK." -ForegroundColor Green

# 3) Auth Docker
Write-Host "`n3. Configurando autenticacao Docker..." -ForegroundColor Yellow
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet
if ($LASTEXITCODE -ne 0) { Write-Host "Erro configurando docker" -ForegroundColor Red; exit 1 }
Write-Host "OK." -ForegroundColor Green

# 4) Build no Cloud Build
Write-Host "`n4. Build da imagem..." -ForegroundColor Yellow
gcloud builds submit --tag $IMAGE --project=$PROJECT
if ($LASTEXITCODE -ne 0) { Write-Host "Erro no build" -ForegroundColor Red; exit 1 }
Write-Host "OK." -ForegroundColor Green

# 5) Recuperar env vars do service em execucao (mantem paridade entre Job e Service)
Write-Host "`n5. Capturando env vars do service em execucao..." -ForegroundColor Yellow
$envFile = Join-Path $env:TEMP "$JOB-env-$(Get-Random).yaml"
$envFlags = @()
$svcDescribeJson = gcloud run services describe $SERVICE `
    --region=$REGION --project=$PROJECT `
    --format=json 2>$null
if ($LASTEXITCODE -ne 0 -or -not $svcDescribeJson) {
    Write-Host "Service ainda nao existe; pulando captura de env. Configure manualmente apos o primeiro deploy." -ForegroundColor Yellow
} else {
    $svc = $svcDescribeJson | ConvertFrom-Json
    $envList = $svc.spec.template.spec.containers[0].env
    $lines = @()
    foreach ($e in $envList) {
        if ($null -ne $e.value -and $e.value -ne "") {
            # YAML escape: escapar aspas duplas no valor
            $val = $e.value -replace '"', '\"'
            $lines += "$($e.name): `"$val`""
        }
    }
    if ($lines.Count -gt 0) {
        $lines | Set-Content -Path $envFile -Encoding utf8
        $envFlags = @("--env-vars-file=$envFile")
        Write-Host "Capturadas $($lines.Count) env vars em $envFile." -ForegroundColor Green
    }
}

# 6) Cria/atualiza Cloud Run Job migrator
Write-Host "`n6. Criando/atualizando Job de migracao ($JOB)..." -ForegroundColor Yellow
$jobExists = gcloud run jobs describe $JOB --region=$REGION --project=$PROJECT 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Job existe; atualizando imagem + env." -ForegroundColor Gray
    $args = @(
        "run", "jobs", "update", $JOB,
        "--image=$IMAGE",
        "--region=$REGION",
        "--project=$PROJECT",
        "--service-account=$SA",
        "--vpc-connector=$VPC",
        "--vpc-egress=private-ranges-only",
        "--set-cloudsql-instances=$SQL_INSTANCE",
        "--command=sh",
        "--args=-c,npx prisma migrate deploy",
        "--max-retries=1",
        "--task-timeout=600s"
    ) + $envFlags
    & gcloud @args
} else {
    Write-Host "Job nao existe; criando." -ForegroundColor Gray
    $args = @(
        "run", "jobs", "create", $JOB,
        "--image=$IMAGE",
        "--region=$REGION",
        "--project=$PROJECT",
        "--service-account=$SA",
        "--vpc-connector=$VPC",
        "--vpc-egress=private-ranges-only",
        "--set-cloudsql-instances=$SQL_INSTANCE",
        "--command=sh",
        "--args=-c,npx prisma migrate deploy",
        "--max-retries=1",
        "--task-timeout=600s"
    ) + $envFlags
    & gcloud @args
}
if ($LASTEXITCODE -ne 0) { Write-Host "Erro criando/atualizando Job" -ForegroundColor Red; exit 1 }
Write-Host "OK." -ForegroundColor Green

# 7) Executa Job e espera (--wait bloqueia ate completar)
Write-Host "`n7. Executando migration Job..." -ForegroundColor Yellow
gcloud run jobs execute $JOB --region=$REGION --project=$PROJECT --wait
if ($LASTEXITCODE -ne 0) {
    Write-Host "Migration FALHOU. Abortando deploy do service para nao subir codigo incompativel com schema antigo." -ForegroundColor Red
    Write-Host "Investigue logs: gcloud run jobs executions list --job=$JOB --region=$REGION --project=$PROJECT" -ForegroundColor Yellow
    exit 1
}
Write-Host "Migracao concluida." -ForegroundColor Green

# 8) Deploy service
Write-Host "`n8. Deploy do service $SERVICE..." -ForegroundColor Yellow
gcloud run deploy $SERVICE `
    --image=$IMAGE `
    --region=$REGION `
    --project=$PROJECT `
    --platform=managed `
    --allow-unauthenticated `
    --memory=512Mi `
    --cpu=1 `
    --max-instances=10
if ($LASTEXITCODE -ne 0) { Write-Host "Erro no deploy" -ForegroundColor Red; exit 1 }

# 9) Cleanup arquivo temporario de env
if ($envFile -and (Test-Path $envFile)) {
    Remove-Item $envFile -Force -ErrorAction SilentlyContinue
}

# 10) URL final + teste
$serviceUrl = gcloud run services describe $SERVICE `
    --region=$REGION --project=$PROJECT `
    --format="value(status.url)"

Write-Host ""
Write-Host "=== Deploy concluido ===" -ForegroundColor Green
Write-Host "URL: $serviceUrl" -ForegroundColor Cyan
Write-Host "Teste:" -ForegroundColor Yellow
Write-Host "  curl $serviceUrl/api/v1/auth/me   # deve retornar 401 sem token" -ForegroundColor Gray
Write-Host ""
