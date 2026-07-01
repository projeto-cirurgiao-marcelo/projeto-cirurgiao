# video-processor-trigger (Cloudflare Worker)

Lado **emissor** do pipeline de vídeo. Consome a Cloudflare Queue `video-processing`
(alimentada por R2 Event Notifications no bucket `s3-projeto-cirurgiao`, prefixo
`inbox/`, `.mp4`) e dispara, fire-and-forget, o `POST /process` no Cloud Run
`video-processor` (GPU L4, `europe-west1`).

```
Professor → R2 /inbox/ → Event Notification → Queue → ESTE WORKER → Cloud Run GPU → R2 /videos/
```

## Segredo (par com o video-processor)

O Worker autentica no Cloud Run com `Authorization: Bearer ${WEBHOOK_SECRET}`.
O `server.py` do video-processor valida esse mesmo `WEBHOOK_SECRET` e **falha ao
iniciar** se estiver vazio (fail-fast). Os dois lados precisam do **mesmo valor**:

- **Emissor (este Worker):** `wrangler secret put WEBHOOK_SECRET` (não vai em arquivo).
- **Receptor (video-processor):** secret `WEBHOOK_SECRET` no Google Secret Manager
  (project `projeto-cirurgiao-e8df7`), injetado como env var no Cloud Run.

Ao rotacionar, atualizar **as duas pontas** na mesma janela.

## Deploy

```bash
cd cloudflare-workers/video-processor-trigger
wrangler deploy
# primeira vez / rotação do segredo:
wrangler secret put WEBHOOK_SECRET
```

`wrangler.toml` fixa a `CLOUD_RUN_URL`. Se a URL do Cloud Run mudar, atualizar lá e
re-`deploy`.

## Endpoints

- Queue consumer (automático via fila `video-processing`).
- `GET /health` — status.
- `POST /trigger` (Bearer `WEBHOOK_SECRET`) — disparo manual `{ "key": "inbox/x.mp4" }`.

> Histórico: este Worker vivia só em `video-pipeline/cloudflare-worker/` (fora do
> git). Trazido para cá em 2026-07-01 (P0.9) para ficar versionado junto do
> `r2-browser`. `.env.local`/`.wrangler/` não são versionados.
