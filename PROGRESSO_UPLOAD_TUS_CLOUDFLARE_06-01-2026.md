# Progresso - Upload TUS Direto para Cloudflare

**Data:** 06/01/2026  
**Sessão:** Upload TUS + Correções de Status + Configurações de Segurança

---

## 📋 Resumo das Implementações

### 1. Upload TUS Direto para Cloudflare (Frontend → Cloudflare)

**Problema:** Uploads de arquivos grandes (6GB+) falhavam por timeout no backend.

**Solução Implementada:**
- Frontend faz upload TUS diretamente para o Cloudflare, sem passar pelo backend
- Backend apenas gera a URL TUS autenticada e cria o registro no banco
- Suporta arquivos de qualquer tamanho (testado com 6.1GB - 4K)

**Arquivos Modificados:**
- `backend-api/src/modules/cloudflare/cloudflare-stream.service.ts`
  - Adicionado método `getTusUploadUrl()` para gerar URL TUS autenticada
  - Adicionado método `updateVideoSecuritySettings()` para configurar segurança do vídeo
  
- `backend-api/src/modules/videos/videos.service.ts`
  - Adicionado método `createVideoWithTusUpload()` para criar registro + retornar URL TUS

- `backend-api/src/modules/videos/videos.controller.ts`
  - Adicionado endpoint `POST /modules/:moduleId/videos/tus-upload-url`

- `frontend-web/src/lib/api/videos.service.ts`
  - Adicionado método `getTusUploadUrl()` para obter URL do backend
  - Adicionado método `uploadVideoTusDirect()` para fazer upload TUS direto

---

### 2. Correção de Status de Upload

**Problema:** Vídeos ficavam em loop "Enviando 0%" mesmo após upload completo.

**Causa:** O `getUploadStatus` só verificava vídeos com status `PROCESSING`, mas vídeos TUS direto ficavam com status `UPLOADING`.

**Solução:**
- `getUploadStatus` agora verifica vídeos com status `UPLOADING` ou `PROCESSING` que tenham `cloudflareId`
- Consulta o Cloudflare para verificar se o vídeo está pronto
- Atualiza automaticamente para `READY` quando o Cloudflare reporta `readyToStream: true`

**Código:**
```typescript
// videos.service.ts - getUploadStatus()
if ((video.uploadStatus === 'PROCESSING' || video.uploadStatus === 'UPLOADING') && video.cloudflareId) {
  const cloudflareDetails = await this.cloudflareStream.getVideoDetails(video.cloudflareId);
  
  if (cloudflareDetails.readyToStream) {
    // Atualizar para READY
    await this.prisma.video.update({
      where: { id: videoId },
      data: {
        uploadStatus: 'READY',
        uploadProgress: 100,
        duration: cloudflareDetails.duration,
        thumbnailUrl: cloudflareDetails.thumbnailUrl,
        cloudflareUrl: cloudflareDetails.playbackUrl,
      },
    });
  }
}
```

---

### 3. Configurações de Segurança Automáticas

**Problema:** Vídeos eram criados no Cloudflare com:
- `requireSignedURLs: true` (exigia URLs assinadas)
- `allowedOrigins: ["*"]` (restringia origens)

**Solução:**
Após criar a URL TUS, o backend automaticamente atualiza as configurações de segurança:

```typescript
// cloudflare-stream.service.ts - getTusUploadUrl()
await this.updateVideoSecuritySettings(uid, {
  requireSignedURLs: false,
  allowedOrigins: [], // Array vazio = sem restrição
});
```

**Método adicionado:**
```typescript
async updateVideoSecuritySettings(
  videoId: string,
  settings: { requireSignedURLs?: boolean; allowedOrigins?: string[] },
): Promise<void> {
  await this.apiClient.post(`/${videoId}`, {
    requireSignedURLs: settings.requireSignedURLs,
    allowedOrigins: settings.allowedOrigins,
  });
}
```

---

## 🚀 Deploys Realizados

### Cloud Run - Backend API

| Revisão | Descrição | Status |
|---------|-----------|--------|
| `projeto-cirurgiao-api-00018-bs4` | Correção getUploadStatus para verificar UPLOADING | ✅ |
| `projeto-cirurgiao-api-00019-5kq` | Configurações de segurança automáticas | ✅ |

### Artifact Registry

Criado repositório Docker:
- `southamerica-east1-docker.pkg.dev/projeto-cirurgiao-e8df7/projeto-cirurgiao-repo/projeto-cirurgiao-api`

---

## 🔄 Fluxo de Upload TUS Direto

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FLUXO DE UPLOAD TUS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Frontend solicita URL TUS                                          │
│     POST /modules/:moduleId/videos/tus-upload-url                      │
│     { title, description, order, fileSize, filename }                  │
│                                                                         │
│  2. Backend:                                                            │
│     a) Cria URL TUS no Cloudflare (com Upload-Metadata)                │
│     b) Atualiza configurações de segurança (requireSignedURLs=false)   │
│     c) Cria registro do vídeo no banco (status: UPLOADING)             │
│     d) Retorna { tusUploadUrl, uid, videoId, video }                   │
│                                                                         │
│  3. Frontend faz upload TUS diretamente para Cloudflare                │
│     - Usa tus-js-client                                                │
│     - Chunks de ~50MB                                                   │
│     - Upload resumível                                                  │
│                                                                         │
│  4. Frontend faz polling de status                                      │
│     GET /videos/:id/upload-status                                       │
│     - Backend consulta Cloudflare                                       │
│     - Atualiza status para READY quando readyToStream=true             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Teste Realizado

**Arquivo:** Ovariectomia nodulectomia vaginal_2160p.mp4
- **Tamanho:** 6.1 GB
- **Resolução:** 3852x2160 (4K)
- **Duração:** 13:19 minutos
- **Cloudflare UID:** `2b2da39c1b2a3c89af8fcacdccf69784`
- **Status Final:** `ready`, `readyToStream: true`

---

## 📝 Arquivos Modificados

### Backend

1. **`backend-api/src/modules/cloudflare/cloudflare-stream.service.ts`**
   - `getTusUploadUrl()` - Gera URL TUS autenticada
   - `updateVideoSecuritySettings()` - Configura segurança do vídeo
   - Metadados TUS sem `allowedorigins`

2. **`backend-api/src/modules/videos/videos.service.ts`**
   - `createVideoWithTusUpload()` - Cria vídeo com URL TUS
   - `getUploadStatus()` - Verifica UPLOADING + PROCESSING

3. **`backend-api/src/modules/videos/videos.controller.ts`**
   - Endpoint `POST /modules/:moduleId/videos/tus-upload-url`

### Frontend

1. **`frontend-web/src/lib/api/videos.service.ts`**
   - `getTusUploadUrl()` - Obtém URL do backend
   - `uploadVideoTusDirect()` - Upload TUS direto para Cloudflare

---

## 🔧 Comandos de Deploy

```bash
# Build da imagem Docker
gcloud builds submit backend-api \
  --tag southamerica-east1-docker.pkg.dev/projeto-cirurgiao-e8df7/projeto-cirurgiao-repo/projeto-cirurgiao-api:latest \
  --project projeto-cirurgiao-e8df7

# Deploy no Cloud Run
gcloud run deploy projeto-cirurgiao-api \
  --image southamerica-east1-docker.pkg.dev/projeto-cirurgiao-e8df7/projeto-cirurgiao-repo/projeto-cirurgiao-api:latest \
  --region southamerica-east1 \
  --project projeto-cirurgiao-e8df7 \
  --allow-unauthenticated
```

---

## 🎯 Próximos Passos

### Verificações do Upload TUS
1. [ ] Testar novo upload para verificar configurações de segurança automáticas
2. [ ] Verificar se `requireSignedURLs: false` é aplicado corretamente
3. [ ] Verificar se `allowedOrigins: []` é aplicado corretamente
4. [ ] Considerar adicionar indicador de progresso de processamento do Cloudflare

### Roadmap - Passos Restantes
8. [ ] Testar integração Firebase Auth com backend
9. [ ] Migrar fluxo de login para Firebase Auth
10. [ ] Configurar CI/CD (GitHub Actions)

---

## 📊 URLs de Produção

- **API:** https://projeto-cirurgiao-api-81746498042.southamerica-east1.run.app
- **Frontend:** https://projeto-cirurgiao.vercel.app
- **Cloudflare Stream:** https://customer-mcykto8a2uaqo5xu.cloudflarestream.com
