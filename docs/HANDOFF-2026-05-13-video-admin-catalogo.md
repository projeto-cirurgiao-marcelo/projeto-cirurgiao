# Handoff — 2026-05-13: pipeline de vídeo, /admin e catálogo

Sessão longa cobrindo: estabilização do pipeline de vídeo R2/HLS, melhorias UX no `/admin`, modelo de reuso de aulas entre módulos, e bridge R2 Browser ↔ Catálogo de Vídeos.

11 commits em `main` (`24a77de..c0c50fd`), 3 serviços com deploy novo (Cloud Run europe-west1, Cloud Run southamerica-east1, Cloudflare Worker), 1 migration aplicada em prod (Prisma).

---

## 1. video-processor: cap NVENC 4096 + Opção C (mezzanine 4K)

**Bug original**: vídeos H.264 com `Used 37 decode surfaces` faziam NVDEC abortar com `CUDA_ERROR_INVALID_VALUE`. Correção inicial: 3-tier fallback (`cuda_original` → `cuda_threads_1` → `cpu_scale_nvenc`) em `encode_hls`.

**Bug seguinte descoberto em prod**: vídeo 8K 2:1 (`Amputacao_..._2160p.mp4`, 4320×2160) falhou no 2160p mesmo com fallback CPU — porque `scale=-2:2160` produz output 4320×2160 e **NVENC H.264 também tem teto de 4096px de largura** (não só NVDEC). Todas as 3 tentativas falham instantaneamente para a profile 2160p.

**Solução final (Opção C + cap)**:
- `normalize_source_if_needed(input, width)`: se `width > 4096`, faz 1 pass CPU decode + scale lanczos 3840 + NVENC encode → `mezzanine_4k.mp4` no tmpdir. Os 3 perfis HLS depois leem do mezzanine via hardware fast-path (NVDEC + scale_cuda + NVENC).
- Filtros dos 3 attempts: `scale_cuda=w=4096:h={H}:force_original_aspect_ratio=decrease:force_divisible_by=2` (e equivalente CPU). Para 2:1 source, 2160p sai como 4096×2048 em vez de 4320×2160.
- `master_playlist_lines` agora usa `compute_output_dims(src_w, src_h, target_h)` pra refletir as dimensões reais após o cap.

**Tempo gasto, no mesmo vídeo 8K que falhou antes**:
- Antes: 49min, falha total no 2160p, 0 arquivos uploaded.
- Depois: ~40min, **3 perfis OK**, 867 arquivos em R2. Breakdown: normalize CPU 22min (bottleneck), encode HW 10min, Whisper L4 1min, upload 5min.

**Limites conhecidos**:
- Vídeos com largura > 4096 ainda precisam do passe CPU (caro, ~25min de wall time pra um 8K de 19min). Eliminar isso exigiria source vir já em ≤4K do equipamento ou em HEVC.
- Upload R2 sequencial via boto3 (~5min para 867 arquivos). Paralelizar com `ThreadPoolExecutor` cortaria pela metade — out of scope.

**Arquivos**:
- `video-pipeline/cloud-run/server.py` (+162/-23)
- `video-pipeline/cloud-run/test_encode_fallback.py` (9 testes passando, incluindo 2:1 source verificando 4096×2048 no master playlist)

**Deploy**: Cloud Run `video-processor` revisão `00011-5cp` em `europe-west1` (URL inalterada).

---

## 2. /admin/jobs: botões de limpeza

Antes não dava pra remover registros de `VideoProcessingJob` falhados pela UI; precisava SQL direto no Cloud SQL.

Implementado: lixeira por linha (qualquer status) + botão **"Limpar falhas (N)"** no header (só aparece com failed). Modal de confirmação inline (mesmo padrão de `admin/videos/page.tsx`). **Sem cascade no R2** — decisão deliberada pra evitar deletar source de jobs marcados erroneamente como `failed` (race de webhook). Operador limpa R2 manualmente com `rclone` se quiser.

**Endpoints novos**:
- `DELETE /jobs/video-processing/failed` (bulk) — declarado **antes** do `:id` pra Express resolver o literal primeiro
- `DELETE /jobs/video-processing/:id` (individual)
- Ambos `@Roles(Role.ADMIN)`

**Arquivos**: `jobs.controller.ts`, `video-jobs.service.ts`, `video-jobs.service.ts` (frontend), `jobs-table.tsx`.

---

## 3. Auth: silent refresh do Firebase ID token no 401

**Causa do "logout irritante"**: o Firebase ID token expira em 1h, era salvo no zustand uma única vez no login e nunca refrescado. Após ~1h, qualquer call backend retornava 401 e `client.ts:88-90` chamava `logout()` imediatamente, kickando o operador ativo.

**Fix (2 camadas complementares)**:
1. **Reativo**: `client.ts` 401 interceptor agora tenta `firebaseAuthService.getCurrentToken()` (que faz `getIdToken(currentUser, true)` — force refresh via refresh token de longa duração). Se devolver token, atualiza zustand e re-executa a request original via `client(originalRequest)` (com flag `_retry` pra evitar loop). Só desloga se o refresh também falhar.
2. **Proativo**: `auth-provider.tsx` adiciona listener `onIdTokenChanged` do SDK Firebase, que dispara ~10min antes da expiração quando o SDK refresca o token sozinho. Sincroniza o token novo no zustand antes da próxima chamada tomar 401.

Resultado: operadores ativos em `/admin` **não devem mais ser deslogados** durante a sessão.

---

## 4. Pipeline de migração: extract-thumbnail-from-hls

Modal "Adicionar Vídeo" em `/admin/modules/:id/videos` no modo R2 HLS agora **auto-extrai a thumbnail** quando o admin seleciona/pasta uma `playlist.m3u8`. Antes era só "Gerar com IA" (Sharp + overlay de título) ou upload manual.

**Arquitetura** (Opção A da exploração — vs A3 que era proxy via video-processor):
- Backend `cirurgiao-api` ganhou ffmpeg no Dockerfile (apt-get production stage)
- `VideosService.extractThumbnailFromHls(dto)`: SSRF guard (URL precisa começar com `CLOUDFLARE_R2_PUBLIC_URL` e estar sob `videos/`), spawn ffmpeg com `-ss 30 -vframes 1 -vf scale=1280:-2:flags=lanczos -q:v 2` + timeout 30s, upload via `CloudflareR2Service.uploadFile` como `videos/<basename>/auto-thumbnail.jpg`
- `POST /modules/:moduleId/videos/extract-thumbnail-from-hls`
- Frontend: useEffect com debounce 600ms dispara em `r2_hls` mode quando `r2HlsUrl` válido + `r2ThumbnailManual` não marcado. UI mostra status (loading/ok/error). Manual upload ou "Gerar com IA" marca `manual=true` e bloqueia auto-overwrite.

**Por que não A3 (proxy via video-processor)?** Descobrimos que backend já tinha R2 creds + Sharp; faltava só ffmpeg. Instalar ffmpeg no Dockerfile (+~50MB) é mais simples que coordenar `VIDEO_PROCESSOR_URL` + shared secret entre serviços.

---

## 5. Reuso de aula entre módulos (Prisma)

Constraint antiga: `Video.r2Basename String? @unique` global. Bloqueava registrar a mesma aula (mesmo `r2Basename` do pipeline externo) em mais de um módulo — caso pedagógico real ("Anestesia 101" usada em Cirurgia Abdominal + Cirurgia Felina).

**Mudança**: drop do `@unique` simples, add `@@unique([r2Basename, moduleId])` composto.

**Regras pedagógicas mantidas (intencionalmente)**:
- Materials/Captions/Quiz: por-Video. Cada placement carrega seus próprios (admin pode personalizar quiz por módulo)
- Progresso do aluno: por-Video. Assistir em Módulo X **não conta** em Módulo Y

`VideosService.createFromR2Hls`: `findUnique({ r2Basename })` → `findFirst({ r2Basename, moduleId })`. Mensagem do 409 atualizada pra "Ja existe um Video ativo **neste módulo**...". Frontend `handleSubmitFromR2Hls` passa a usar `getErrorMessage(error)` (helper já existente em `client.ts`) pra surface a mensagem útil do backend em vez de `"Request failed with status code 409"`.

**Migration**: `prisma/migrations/20260513114133_allow_video_reuse_across_modules/` — aplicada em prod no startup do backend (`prisma migrate deploy` na CMD do Dockerfile).

---

## 6. /admin/media: largura horizontal

Bug clássico de CSS Grid: `lg:grid-cols-[300px_1fr]` → `1fr` tem `min-content` como largura mínima, então conteúdo intrínseco largo (URLs, `<code>` inline sem break) expandia a track além do viewport e esticava `<main>` (que não tem `max-width` em `admin/layout.tsx`).

**Fix**: `lg:grid-cols-[300px_minmax(0,1fr)]` + `break-words` no `<p>` helper + `break-all` no `<code>` inline.

Mesmo fix aplicado preventivamente em `/admin/r2-browser`.

---

## 7. /admin/r2-browser: modo Aula vs modo Navegação

**Problema reportado**: admin não entende "segmentos" (`.ts`) e variantes (`720p.m3u8`, `1080p.m3u8`, `2160p.m3u8`). UI mostrava ~300-900 arquivos por aula como lista crua — totalmente confuso.

**Solução** (Opção C de 4 alternativas brainstormadas):
- Detecção dinâmica: pasta com `playlist.m3u8` → **modo Aula**. Sem → **modo Navegação**.
- Modo Aula: player HLS inline 16:9 + 2 botões grandes (`Copiar URL HLS`, `Copiar VTT pt-BR`) + bloco "Manifest desta pasta" + accordion colapsado "Arquivos brutos (N segmentos, N variantes)" pra fallback técnico
- Modo Navegação: subpastas viram **cards em grid** (2/3/4 cols responsivo) no painel central, não só na sidebar

**Zero chamadas extras**: detecção via `objects.some(o => basename(o.key) === 'playlist.m3u8')`.

---

## 8. /admin/r2-browser: folders via índice KV (perf)

**Bug**: navegar pra `videos/` (com 100+ aulas, ~60k descendentes) estourava o loop `/list` com `SAFETY_CAP=30`. R2 com `delimiter='/'` distribui `CommonPrefixes` em múltiplas páginas porque gasta orçamento interno de scan enumerando os `.ts`.

**Fix**: Worker já tinha endpoint `/index` expondo o índice KV completo de folders mantido pelo cron. Frontend não estava usando.

- `getFolderIndex({ includeAll })` no service (chama `/index?hasPlaylist=false`)
- `r2-browser.tsx`: carrega índice 1× no mount + refresh após reindex. `subfolderEntries` derivado por filtro em memória (parent path canônico). `/list` continua sendo usado **só pra objetos** da pasta atual (`SAFETY_CAP=5` agora)
- Bug seguinte do mesmo fix: em pasta categoria (videos/), R2 marca `IsTruncated=true` enquanto enumera CommonPrefixes mesmo com `Contents=[]` — early-return quando 1ª página devolve 0 objects, sem warning falso-positivo

---

## 9. /admin/r2-browser: view modes + sort

Opção B confirmada (Worker + frontend):

**Worker**:
- `FolderNode` ganha `lastUpdated?: string` (ISO). Capturado em `mergePlaylistObject` a partir de `R2Object.uploaded` quando o indexer vê o `playlist.m3u8` (leaf). Toma o `max` em rebuild incremental
- `/index` handler propaga o campo
- Backward compat: opcional. Índice KV já em prod retorna `undefined` até o próximo "Reindex tudo" rodar

**Frontend (`object-list.tsx`)**:
- View toggle: 2 botões (`LayoutGrid` / `ListIcon`) no header da seção Subpastas
- Sort `<select>`: 4 opções — A→Z (default), Z→A, Mais recentes primeiro, Mais antigos primeiro. Ícone visual ao lado reflete o modo
- Modo Lista: linhas com data relativa + `fileCount` em badge
- Persistência: `localStorage.r2-browser-view-mode` + `localStorage.r2-browser-sort`
- Sort estável: empate de data cai no name-asc; entradas sem `lastUpdated` vão pro final
- Fallback: se índice KV ainda não carregou (cold start), monta entries mínimas do `/list` — sort por data inerte nesse fallback

**⚠️ Pendência manual**: clicar **"Reindex tudo"** em `/admin/r2-browser` 1× (~5min) pra popular `lastUpdated` em todas as ~100 folders já existentes no KV. Aulas processadas pelo pipeline a partir de agora já vão ter o campo. **Importante**: sem esse reindex, sort por data fica "inerte" pras aulas antigas.

**Observação importante (confirmada)**: sort/filtro/view-mode são **100% client-side**. Reordena array em memória, salva preferência em `localStorage`. Zero chamadas backend, zero ops R2, zero alteração em metadata/estrutura de pastas/arquivos. Por design — R2 é flat e imutável.

---

## 10. Bridge R2 Browser ↔ Catálogo + rename "Media Library"

Resposta ao "porque não posso mover pasta R2 pra outra pasta?".

**Discovery**: o sistema **já tem** a resposta — `/admin/media` é o catalog layer (MediaFolder table + `Video.folderId`). Mover = `UPDATE Video.folderId`, zero ops em R2. Storage R2 é imutável por design. O que faltava era discoverability.

**A — Bridge UX em `/admin/r2-browser`**:
- Modo Aula ganha bloco **"Catálogo"** mostrando:
  - Em quantos módulos a aula está registrada
  - MediaFolder atual (ou "Sem pasta de catálogo")
  - Lista de placements (Curso / Módulo / Pasta) por Video
  - Botão **"Catalogar em..."** (ou "Mover catálogo") → abre `MoveToModal` (mesmo componente do `/admin/media`)
- Backend: `GET /videos/by-r2-basename?basename=X` retorna `Video[]` com `folder` + `module` + `course`
- Frontend: `VideoByR2Basename` type + `videosService.findByR2Basename()`. `MoveToModal.onConfirm` faz batch `moveVideo(id, targetFolderId)` em todos os Videos com mesmo `r2Basename`

**B — Linguagem clareada**:
- Sidebar: `Media Library` → **Catálogo de Vídeos**
- `/admin/media` ganha helper bloco "Onde meu vídeo aparece?" no topo, explicando as 3 dimensões (R2 físico / Catálogo lógico / Módulo pedagógico)
- "Inbox" / "Vídeos no DB sem pasta" → "Sem categoria" / "Vídeos sem categoria"
- "Pastas no R2 sem Video cadastrado" → "Aulas em R2 ainda não cadastradas"

---

## Commits da sessão (`24a77de..c0c50fd`)

```
c0c50fd feat(admin): bridge R2 Browser <-> Catalogo + rename media library
624e178 feat(admin/r2-browser): view modes + sort por nome/data nas subpastas
b640198 fix(admin/r2-browser): silenciar truncation falso-positivo em categorias
f8b1a7d fix(admin/r2-browser): folders via KV index — sem estourar cap de /list
ee3c9aa feat(admin/r2-browser): modo aula com player inline + cards de navegacao
36f0545 fix(admin/media): impedir estica horizontal via grid minmax + break-words
df9944b feat(video): permitir reuso de aula R2 HLS entre modulos
4260dbe feat(admin): auto-extract thumbnail from R2 HLS playlist
dcccdf2 fix(auth): silent refresh do Firebase ID token no 401
b18533f feat(admin): delete failed video jobs (backend + frontend)
11518da feat(video-pipeline): cap NVENC 4096 + opcao C mezzanine 4K
```

## Revisões em produção (estado ao fechar a sessão)

| Serviço | Onde | Revisão |
|---|---|---|
| video-processor | Cloud Run europe-west1 | `00011-5cp` |
| projeto-cirurgiao-api | Cloud Run southamerica-east1 | `00088-frn` |
| r2-browser (Worker) | Cloudflare Workers | `30d0bad6-2763-4310-bc4f-cd82e71dcc65` |
| frontend-web | Vercel via `main` | `c0c50fd` |

## Migrations aplicadas

- `20260513114133_allow_video_reuse_across_modules` — drop `Video.r2Basename @unique`, add `@@unique([r2Basename, moduleId])`. Aplicada via `prisma migrate deploy` no cold start do backend rev `00087-m6g`.

## Pendências para próxima sessão

1. **Reindex tudo no R2 Browser**: clicar 1× em `/admin/r2-browser` → "Reindex tudo" (~5min). Sem isso, sort "Mais recentes primeiro" / "Mais antigos primeiro" só funciona pra aulas processadas a partir de hoje (lastUpdated vazio no KV legado).
2. **Limpeza pendente em /admin/jobs**: provavelmente acumularam jobs `failed` durante esta sessão de testes. Usar os botões novos pra limpar.
3. **Vídeo `inbox/` antigo no R2**: vários sources de teste removidos via rclone (`Amputacao_..._caso_2_2160p.mp4`, `Ruptura-de-uretra...`, `hernia_perianal...`, `GMT20230330...`). Verificar se há mais lixo orphan.
4. **Backend `WEBHOOK_SECRET` vazio no video-processor**: descoberto durante a investigação A3 vs A1 do thumbnail extractor. `/process` no video-processor está sem auth efetiva em prod (qualquer um com a URL pode trigerar). Cloudflare Worker é quem chama em condições normais, mas vale fechar essa porta — adicionar `WEBHOOK_SECRET` no env do video-processor + atualizar o Worker pra enviar `Authorization: Bearer <secret>`.
5. **Pipeline de upload R2 sequencial**: paralelizar com `ThreadPoolExecutor` cortaria ~50% do tempo de upload em aulas grandes. Não urgente.
6. **Cap de width 4096 no NVENC**: para sources 8K 2:1, perda silenciosa de 64px de altura (4096x2048 em vez de 4320x2160). Trade-off aceito — alternativa seria HEVC no NVENC (suporta até 8192), mas exige player com decode HEVC e tem implicações de compatibilidade.

## Decisões de arquitetura preservadas para futuras dúvidas

- **R2 é imutável**: storage flat object-store, sem operação de "mover pasta". Toda reorganização lógica vive no DB via MediaFolder.
- **3 dimensões de um Video**: R2 prefix (físico, imutável) / MediaFolder (catálogo, mutável) / Module placement (pedagógico, sequência de aulas).
- **Quiz/Materials/Progress por-Video, não por-Source**: regra pedagógica vigente. Mesma aula em N módulos = N Videos com mesmo `r2Basename`, cada um com seu próprio quiz e progresso de aluno.
- **Sem cascade R2 ao deletar VideoProcessingJob**: operador limpa R2 separado via rclone se quiser. Backend não toca em storage por delete admin de registro auxiliar.
- **Sort/view-mode é cliente-side puro**: zero side effects, zero requisições, zero mudança em metadata.
