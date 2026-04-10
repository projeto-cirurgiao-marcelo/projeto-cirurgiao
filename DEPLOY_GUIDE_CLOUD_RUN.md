# Guia de Deploy — Cloud Run + Cloud SQL (Projeto Cirurgião)

> Documento criado em 22/03/2026 após resolver problemas de deploy do backend NestJS.
> Atualizado em 07/04/2026 com deploy v64 e processo de migrations via IP publico.
> Serve como referência para futuros deploys, incluindo a versão mobile (React Native/Expo).

---

## Arquitetura de Produção

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   Frontend Web      │     │   Mobile App         │     │   Admin Web         │
│   (Vercel)          │     │   (Expo/RN)          │     │   (Vercel)          │
│   projetocirurgiao  │     │   iOS / Android      │     │                     │
│   .app              │     │                      │     │                     │
└────────┬────────────┘     └──────────┬───────────┘     └──────────┬──────────┘
         │                             │                            │
         │  HTTPS                      │  HTTPS                     │  HTTPS
         ▼                             ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Cloud Run (southamerica-east1)                       │
│                        projeto-cirurgiao-api                                │
│                                                                             │
│  Image: cirurgiao-api/projeto-cirurgiao-api:v64                            │
│  Memory: 2Gi  |  CPU: 1  |  Max instances: 2                              │
│  VPC Connector: cloud-run-connector                                        │
│  VPC Egress: private-ranges-only                                           │
│  IAM: allUsers (auth via NestJS Firebase Guard)                            │
│  CORS: projetocirurgiao.app                                                │
└────────┬────────────────────────────────────────────────────────────────────┘
         │
         │  IP Privado (172.21.0.3:5432)
         │  Via VPC Connector → VPC Peering
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Cloud SQL (cirurgiao-db)                             │
│                        PostgreSQL                                           │
│                                                                             │
│  IP Público: 35.199.87.196 (apenas IPs de dev autorizados)                 │
│  IP Privado: 172.21.0.3 (via VPC peering com rede "default")              │
│  Authorized Networks: apenas 3 IPs de desenvolvimento                      │
│  0.0.0.0/0: REMOVIDO                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```



## Problemas Encontrados e Soluções

### 1. Container crashava sem logs no Cloud Run

**Sintoma:** Novas revisões eram criadas mas crashavam silenciosamente. Nenhum log de aplicação aparecia no Cloud Logging. A revisão antiga (00030) continuava servindo.

**Causa raiz:** NÃO era Prisma binary targets (nossa suspeita inicial). Eram dois serviços NestJS que faziam `throw new Error()` no constructor quando credenciais não existiam:

- `CloudflareStreamService`: `throw new Error('Cloudflare credentials not configured')`
- `UploadService`: `throw new Error('Cloudflare R2 credentials not configured')`

O throw no constructor impedia o NestJS de iniciar, e como era antes do `app.listen()`, o Cloud Run nunca recebia conexão na porta 8080.

**Solução:**
```typescript
// ANTES (mata o app inteiro)
if (!this.accountId || !this.apiToken) {
  throw new Error('Cloudflare credentials not configured');
}

// DEPOIS (warning + flag)
if (!this.accountId || !this.apiToken) {
  this.isConfigured = false;
  this.logger.warn('Cloudflare Stream credentials not configured — features disabled');
  return;
}
this.isConfigured = true;

// Guard nos métodos públicos
private ensureConfigured(): void {
  if (!this.isConfigured) {
    throw new BadRequestException('Cloudflare Stream is not configured');
  }
}
```

**Lição:** Serviços que dependem de credenciais externas NUNCA devem crashar no constructor. Usar flag `isConfigured` e validar nos métodos.

**Como diagnosticar:** Rodar a imagem localmente com `docker run` em foreground para ver o stack trace:
```bash
docker run --rm -e PORT=8080 -e NODE_ENV=production \
  -e DATABASE_URL="..." -e JWT_SECRET=test \
  -p 8081:8080 imagem:tag
```

---

### 2. Startup logs ausentes

**Sintoma:** Quando o container crashava, não havia nenhuma informação sobre o que aconteceu.

**Solução:** Adicionar logs ANTES do NestJS iniciar e um catch global:

```typescript
// main.ts
console.log('🔄 Starting application...');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PORT: ${process.env.PORT || 3000}`);
console.log(`DATABASE_URL defined: ${!!process.env.DATABASE_URL}`);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ...
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start application:', err);
  process.exit(1);
});
```

---

### 3. CORS bloqueado pelo Cloud Run IAM

**Sintoma:** Frontend recebia erro CORS ao tentar fazer login. O preflight OPTIONS retornava 403.

**Causa:** Cloud Run com `--no-allow-unauthenticated` bloqueia TODAS as requests sem token IAM, incluindo o preflight OPTIONS do browser. O browser nunca envia auth headers no OPTIONS.

**Solução:**
1. Permitir invocações não-autenticadas no Cloud Run (IAM `allUsers` como `run.invoker`)
2. A autenticação real é feita pelo NestJS (`FirebaseAuthGuard`), não pelo IAM do Cloud Run
3. Adicionar `CORS_ORIGINS` como env var:

```bash
gcloud run services add-iam-policy-binding projeto-cirurgiao-api \
  --member="allUsers" \
  --role="roles/run.invoker"
```

**Importante para o mobile:** O React Native NÃO usa CORS (não é browser), então esse problema específico não acontecerá no app mobile. Mas a mudança de IAM para `allUsers` é necessária de qualquer forma.

---

### 4. CORS_ORIGINS não configurado

**Sintoma:** Mesmo após liberar IAM, o NestJS não retornava headers CORS porque `CORS_ORIGINS` não estava nas env vars do Cloud Run.

**Solução:** Adicionar a env var com as origens permitidas. O `main.ts` lê `CORS_ORIGINS`:

```typescript
const corsOrigins = corsOriginsEnv
  ? corsOriginsEnv.split(',').map((origin) => origin.trim())
  : ['http://localhost:3001', 'http://localhost:3000'];
```

**Para o mobile:** Quando o app mobile fizer requests, ele não enviará `Origin` header da mesma forma que o browser. Porém, se usar WebView internamente, pode ser necessário adicionar a origem.

---

### 5. Env vars com caracteres especiais (`&`) no gcloud

**Sintoma:** `gcloud run services update --update-env-vars` interpretava `&` no DATABASE_URL como separador de variáveis.

```
DATABASE_URL=postgresql://...?sslmode=require&connection_limit=3
                                             ^ interpretado como separador
```

**Solução:** Usar arquivo YAML para env vars:

```bash
# Criar cloud-run-env.yaml temporário
cat > cloud-run-env.yaml << 'EOF'
DATABASE_URL: "postgresql://user:pass@host:5432/db?sslmode=require&connection_limit=3"
JWT_SECRET: "..."
# ... outras vars
EOF

# Deploy com arquivo
gcloud run deploy projeto-cirurgiao-api \
  --env-vars-file=cloud-run-env.yaml \
  --project=projeto-cirurgiao-e8df7 \
  --region=southamerica-east1

# IMPORTANTE: Deletar o arquivo após deploy (contém credenciais)
rm cloud-run-env.yaml
```

**NUNCA** commitar `cloud-run-env.yaml` no git. Já está no `.gitignore`.

---

### 6. `--set-env-vars` apaga TODAS as variáveis

**Sintoma:** Usar `--set-env-vars` para adicionar UMA variável removeu TODAS as outras.

**Solução:** Usar `--update-env-vars` (adiciona/atualiza sem remover) ou `--env-vars-file` (substitui tudo de uma vez com o arquivo completo).

---

### 7. Revisão falha bloqueia novos deploys

**Sintoma:** Quando uma revisão falhava no startup, ela ficava em estado "stuck" e bloqueava qualquer deploy ou update subsequente com o erro:
```
Revision 'projeto-cirurgiao-api-00052-wzq' is not ready and cannot serve traffic
```

**Solução:**
1. Garantir que o tráfego está na revisão que funciona:
   ```bash
   gcloud run services update-traffic projeto-cirurgiao-api \
     --to-revisions=REVISAO-FUNCIONAL=100
   ```
2. Deletar a revisão problemática:
   ```bash
   gcloud run revisions delete REVISAO-PROBLEMATICA --quiet
   ```
3. Se não conseguir deletar ("actively serving"), forçar tráfego primeiro
4. Se for a "latest", criar um novo deploy que sobrescreva

---

### 8. Cloud SQL: conexão via IP direto vs Unix Socket vs IP Privado

**Tentativas e resultados:**

| Método | DATABASE_URL | Resultado |
|--------|-------------|-----------|
| IP público direto | `postgresql://user:pass@35.199.87.196:5432/db` | Funciona, mas requer `0.0.0.0/0` |
| Unix Socket | `postgresql://user:pass@localhost/db?host=/cloudsql/INSTANCE` | Prisma adiciona `:5432` ao path do socket → falha |
| localhost:5432 | `postgresql://user:pass@127.0.0.1:5432/db` | Cloud SQL connector não expõe TCP → falha |
| **IP privado via VPC** | `postgresql://user:pass@172.21.0.3:5432/db` | **Funciona! Solução final.** |

**Solução final:** VPC Connector + IP Privado do Cloud SQL.

---

### 9. Setup completo do VPC Connector + IP Privado

Este é o procedimento que foi executado e que deve ser replicado se necessário:

```bash
# 1. Habilitar APIs necessárias
gcloud services enable servicenetworking.googleapis.com vpcaccess.googleapis.com \
  --project=projeto-cirurgiao-e8df7

# 2. Criar range de IP para VPC Peering
gcloud compute addresses create google-managed-services-default \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=16 \
  --network=default \
  --project=projeto-cirurgiao-e8df7

# 3. Criar VPC Peering com Google Services
gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services-default \
  --network=default \
  --project=projeto-cirurgiao-e8df7

# 4. Habilitar IP privado no Cloud SQL (demora ~15 min)
gcloud sql instances patch cirurgiao-db \
  --network=default \
  --project=projeto-cirurgiao-e8df7

# 5. Verificar IP privado atribuído
gcloud sql instances describe cirurgiao-db \
  --format="yaml(ipAddresses)" \
  --project=projeto-cirurgiao-e8df7
# Output: 172.21.0.3 (type: PRIVATE)

# 6. Verificar/Criar VPC Connector (já existia: cloud-run-connector)
gcloud compute networks vpc-access connectors list \
  --region=southamerica-east1 \
  --project=projeto-cirurgiao-e8df7

# 7. Deploy do Cloud Run com VPC Connector
gcloud run deploy projeto-cirurgiao-api \
  --image=IMAGE_URL \
  --env-vars-file=cloud-run-env.yaml \
  --vpc-connector=cloud-run-connector \
  --vpc-egress=private-ranges-only \
  --memory=2Gi \
  --project=projeto-cirurgiao-e8df7 \
  --region=southamerica-east1

# 8. Remover 0.0.0.0/0 do Cloud SQL
gcloud sql instances patch cirurgiao-db \
  --authorized-networks="IP1/32,IP2/32,IP3/32" \
  --project=projeto-cirurgiao-e8df7
```

---

### 10. Out of Memory (OOM) na Biblioteca IA

**Sintoma:** Requests para `/library/chat/conversations/:id/messages` retornavam 503. Logs mostravam:
```
Memory limit of 512 MiB exceeded with 566 MiB used
Memory limit of 1024 MiB exceeded with 1191 MiB used
```

**Causa:** O `KnowledgeSearchService.searchChunks()` carrega TODOS os embeddings do banco para memória para calcular similaridade por cosseno. Com muitos chunks, isso excede 1Gi.

**Solução temporária:** Aumentar memória para 2Gi.

**Solução futura recomendada:** Usar pgvector (extensão PostgreSQL) para calcular similaridade no banco, evitando carregar embeddings para a aplicação.

---

### 11. Timeout no frontend (30s vs tempo de resposta da IA)

**Sintoma:** Backend gerava resposta com sucesso (log: "Library response generated. Tokens: 9114") mas o frontend mostrava erro.

**Causa:** `apiClient` do axios tinha `timeout: 30000` (30s). A busca de embeddings + geração de resposta levava ~37s.

**Solução:** Timeout específico de 120s no `sendMessage` da biblioteca:
```typescript
async sendMessage(conversationId: string, message: string) {
  const { data } = await apiClient.post(
    `/library/chat/conversations/${conversationId}/messages`,
    { message },
    { timeout: 120000 }, // 2 minutos para IA
  );
  return data;
}
```

**Para o mobile:** O `apiClient` do React Native também deve ter timeout aumentado para endpoints de IA. Verificar `mobile-app/src/services/api/client.ts`.

---

## Checklist para Deploy do Backend

```
□ 1. Buildar imagem via Cloud Build:
     gcloud builds submit --tag southamerica-east1-docker.pkg.dev/projeto-cirurgiao-e8df7/cirurgiao-api/projeto-cirurgiao-api:vXX

□ 2. Testar localmente (opcional mas recomendado):
     docker run --rm -e PORT=8080 -e DATABASE_URL="..." -p 8081:8080 imagem:vXX

□ 3. Criar cloud-run-env.yaml com todas as env vars

□ 4. Deploy:
     gcloud run deploy projeto-cirurgiao-api \
       --image=IMAGE \
       --env-vars-file=cloud-run-env.yaml \
       --vpc-connector=cloud-run-connector \
       --vpc-egress=private-ranges-only \
       --memory=2Gi \
       --allow-unauthenticated

□ 5. Verificar nova revisão:
     gcloud run revisions list --service=projeto-cirurgiao-api --limit=3

□ 6. Rotear tráfego (se necessário):
     gcloud run services update-traffic projeto-cirurgiao-api \
       --to-revisions=NOVA-REVISAO=100

□ 7. Testar endpoints:
     curl -s https://projeto-cirurgiao-api-81746498042.southamerica-east1.run.app/api/v1/auth/login

□ 8. Limpar:
     rm cloud-run-env.yaml
     gcloud run revisions delete REVISAO-ANTIGA --quiet

□ 9. Rodar migrations (se houver):
     Opcao A - Via IP publico (se seu IP esta autorizado):
       DATABASE_URL="postgresql://app_cirurgiao:SENHA@35.199.87.196:5432/projeto_cirurgiao" npx prisma migrate deploy
     Opcao B - Via Cloud SQL Proxy:
       start-proxy.bat (terminal separado)
       DATABASE_URL="postgresql://app_cirurgiao:SENHA@127.0.0.1:5434/projeto_cirurgiao" npx prisma migrate deploy
     Opcao C - Via gcloud jobs:
       gcloud run jobs execute run-migrations --wait
     IMPORTANTE: Usar user app_cirurgiao (owner das tabelas), NAO postgres
```

---

## Checklist para o Mobile (React Native/Expo)

Quando o app mobile for para produção, atentar para:

```
□ 1. API_URL deve apontar para a URL do Cloud Run:
     https://projeto-cirurgiao-api-81746498042.southamerica-east1.run.app/api/v1

□ 2. CORS NÃO é problema no React Native (não é browser)
     - Mas se usar WebView, adicionar origem ao CORS_ORIGINS

□ 3. Timeout do apiClient para endpoints de IA deve ser ≥ 120s
     - Verificar mobile-app/src/services/api/client.ts

□ 4. Firebase Auth: o app mobile usa Firebase token → backend valida
     - Mesmo fluxo do web, sem mudanças no backend

□ 5. Cloud Run IAM é allUsers — não precisa de token IAM
     - A autenticação é feita pelo FirebaseAuthGuard no NestJS

□ 6. Se precisar de push notifications, configurar FCM no Cloud Run env vars

□ 7. Deep linking: configurar scheme no app.json e rotas no backend se necessário
```

---

## Credenciais e Acessos (Referência)

| Item | Valor | Notas |
|------|-------|-------|
| Cloud SQL Instance | `cirurgiao-db` | southamerica-east1 |
| IP Público | `35.199.87.196` | Apenas IPs de dev autorizados |
| IP Privado | `172.21.0.3` | Via VPC, usado pelo Cloud Run |
| User app | `app_cirurgiao` | CRUD only, senha forte |
| User admin | `postgres` | Senha forte, uso restrito |
| VPC Connector | `cloud-run-connector` | range 10.8.0.0/28 |
| Artifact Registry | `cirurgiao-api` | southamerica-east1 |
| Cloud Run URL | `projeto-cirurgiao-api-81746498042.southamerica-east1.run.app` | |
| Proxy local | `start-proxy.bat` | porta 5432 |

---

## Comandos Úteis

```bash
# Ver logs em tempo real
gcloud logging read 'resource.labels.service_name="projeto-cirurgiao-api"' \
  --project=projeto-cirurgiao-e8df7 --limit=20 --format="value(severity,textPayload)"

# Ver revisões ativas
gcloud run revisions list --service=projeto-cirurgiao-api \
  --project=projeto-cirurgiao-e8df7 --region=southamerica-east1

# Ver env vars do Cloud Run
gcloud run services describe projeto-cirurgiao-api \
  --format="yaml(spec.template.spec.containers[0].env)" \
  --project=projeto-cirurgiao-e8df7 --region=southamerica-east1

# Ver authorized networks do Cloud SQL
gcloud sql instances describe cirurgiao-db \
  --format="yaml(settings.ipConfiguration.authorizedNetworks)" \
  --project=projeto-cirurgiao-e8df7

# Verificar status de migration
cd backend-api && npx prisma migrate status

# Marcar migration como aplicada (quando schema já existe)
npx prisma migrate resolve --applied NOME_DA_MIGRATION

# Se migration falhou e ficou stuck, marcar como rolled back e reaplicar:
npx prisma migrate resolve --rolled-back NOME_DA_MIGRATION
npx prisma migrate deploy
```

---

## Historico de Deploys Recentes

| Data | Versao | Conteudo |
|------|--------|----------|
| 10/04/2026 | v71 | Player HLS 4K (R2 CDN), VttTextService, Sharp thumbnails (Pango), webpack externals, rate limit 20 req/s, migration hlsUrl, TranscriptsModule desativado, fonts no Docker |
| 03/04/2026 | v64 | Fix progresso cursos (courses completando prematuramente), migration add_chunk_translation_fields (Biblioteca IA), melhorias knowledge-ingestion |
| 22/03/2026 | v47-v63 | VPC setup, CORS fix, OOM fix (2Gi), Biblioteca IA, Gamificacao |
