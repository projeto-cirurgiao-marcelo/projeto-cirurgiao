# r2-browser Worker

Cloudflare Worker que expõe uma API leve sobre o bucket R2 `s3-projeto-cirurgiao` para o admin do projeto. Index de pastas é precomputado e cacheado em KV; busca prioriza nome de pasta pai (basename do vídeo).

Consumido por `frontend-web/src/app/(dashboard)/admin/r2-browser/`.

## Endpoints

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| `GET` | `/health` | público | Status do worker + idade do index |
| `GET` | `/list?prefix=videos/&cursor=...` | JWT admin | Lista folders + objetos do prefix |
| `GET` | `/search?q=valvar&limit=20` | JWT admin | Busca em folder index com pesos |
| `GET` | `/signed-url?key=<key>&ttl=3600` | JWT admin | Presigned URL via R2 binding |
| `POST` | `/reindex` | JWT admin | Força rebuild do folder index |

Cron `0 * * * *` reconstrói o folder index automaticamente a cada hora.

## Setup

```bash
cd cloudflare-workers/r2-browser
npm install

# Cria namespace KV — copiar id retornado para wrangler.toml
npx wrangler kv:namespace create INDEX_KV

# Secrets (não commitar)
npx wrangler secret put CDN_BASE_URL   # ex: https://cdn.projetocirurgiao.app
# BACKEND_API_URL fica em wrangler.toml [vars] — não é secret

# Dev local
npm run dev

# Deploy
npm run deploy
```

## Observações

- Worker é **read-only** sobre R2. Nunca chama `BUCKET.put` / `BUCKET.delete`.
- KV `folder-index:v1` é o único cache. TTL safety net 7 dias; cron sobrescreve toda hora.
- CORS allowlist em `wrangler.toml > [vars] ALLOWED_ORIGINS`.

## Estrutura do folder index

```ts
type FolderIndex = {
  builtAt: string;
  folderCount: number;
  folders: FolderNode[];
};

type FolderNode = {
  fullPath: string;       // "videos/cardio/anatomia/valvar-aortica"
  parentName: string;     // "valvar-aortica"  (peso 3x)
  ancestors: string[];    // ["videos","cardio","anatomia"]  (peso 1x)
  depth: number;
  hasPlaylist: boolean;   // true se contém playlist.m3u8
  fileCount: number;
};
```
