# Investigação e Reconciliação de Player de Vídeo — Projeto Cirurgião

## §0. Missão

Diagnosticar e resolver inconsistência no stack de player de vídeo do Projeto Cirurgião (web + mobile), onde resquícios visuais de Cloudflare Stream persistem apesar da migração documentada para self-hosted HLS.

O agente principal afirmou que a biblioteca de playback é "hls.js" e que removê-la quebraria vídeos. Esse diagnóstico é superficial e mistura camadas distintas. Antes de qualquer modificação de código, validar rigorosamente em **três camadas independentes** (storage / playback engine / UI player) com evidência empírica concreta.

**Não é refactor.** É audit + fix cirúrgico baseado em evidência.

---

## §1. Contexto técnico

### 1.1 Stack documentado (estado pretendido pós-migração)

- **Storage:** Cloudflare R2 (videos + segments + manifests + subtitles)
- **Encoding:** FFmpeg local com NVENC, gera 480p/720p/1080p renditions
- **Delivery:** HLS adaptive bitrate via `.m3u8` manifests servidos do R2 via CDN Cloudflare
- **Subtitles:** Whisper local extrai legendas, servidas como `.vtt` ao lado dos manifests
- **Frontend web:** Next.js (provavelmente com React)
- **Frontend mobile:** Expo / React Native
- **Banco:** Cloud SQL PostgreSQL na GCP (project `projeto-cirurgiao-e8df7`, region `southamerica-east1`)

### 1.2 Stack legado (pré-migração)

- **Storage + delivery:** Cloudflare Stream (custou ~$50k/year só pra delivery 4K — motivou a migração)
- **Player:** Cloudflare Stream embed via `<stream>` web component (`@cloudflare/stream-react`) ou iframe `customer-*.cloudflarestream.com`

### 1.3 Sintoma observado

- Frontend web ainda exibe player visualmente "tipo Cloudflare Stream" em alguns ou todos os vídeos
- Agente principal afirma que biblioteca em uso é "hls.js" (ou "HLJS", terminologia ambígua)
- Agente afirma que desinstalar a lib quebraria vários vídeos — implica subset de vídeos depende dela ativamente

### 1.4 Por que o diagnóstico do agente é insuficiente

"O player é hls.js" mistura três camadas distintas:

1. **Engine de playback:** parser de `.m3u8`, baixa segments, alimenta `<video>` element. Pode ser hls.js, shaka-player, native browser, etc.
2. **UI player:** desenha controles, overlays, fullscreen, captions toggle. Pode ser Plyr, video.js, Mux Player, custom React component, iframe, etc.
3. **Source URL:** de onde os bytes vêm. R2 (CDN próprio), Cloudflare Stream (`customer-xxx.cloudflarestream.com`), ou outro.

**hls.js não desenha NADA.** Apenas alimenta um `<video>`. "Player tipo Cloudflare Stream" se refere à camada UI — o agente respondeu sobre engine quando a observação era sobre UI.

A afirmação "se desinstalar, vídeos quebram" é ambígua:
- Pode significar: "alguns vídeos estão em URLs `.m3u8` e o browser não tem HLS nativo (Chrome/Firefox), precisam de hls.js como shim" → comportamento esperado e correto
- Pode significar: "alguns vídeos estão em URLs Stream que precisam de SDK específico" → lib que precisa ser identificada NÃO é hls.js, é `@cloudflare/stream-react` ou similar

A diferença é fundamental e o agente não distinguiu.

**Nuance importante:** o player iframe do Cloudflare Stream **internamente usa hls.js**. Se há iframe de Stream embedado em algum componente, hls.js pode aparecer no devtools como dependência carregada — mas é a versão dentro do iframe, não a do app. Isso pode ter confundido o agente principal.

### 1.5 Hipóteses concorrentes (todas precisam ser testadas)

| H | Descrição | Implicação |
|---|---|---|
| H1 | Migração completa; UI usa lib com visual semelhante ao Stream (ex: video.js skin custom, Mux Player, Plyr) | Cosmético, sem resíduo real de Stream |
| H2 | Migração parcial: alguns vídeos em Stream, outros em R2; player tem dois caminhos condicionais | Débito técnico: completar migração |
| H3 | `@cloudflare/stream-react` ou similar instalado e em uso lado a lado com hls.js | Lib pode ser removida com cuidado |
| H4 | Iframe direto de `customer-xxx.cloudflarestream.com` em componente legado | URLs hardcoded a identificar e migrar |
| H5 | Mobile RN usa WebView com URL Stream (regressão da migração) | Reescrever para `expo-video`/`react-native-video` nativo |
| H6 | hls.js instalado mas NÃO é o player real — outra lib (ex: Mux Player, video.js) usa hls.js como engine internamente, agente confundiu | Conhecer arquitetura real de UI antes de mexer |
| H7 | Confusão de terminologia pura: lib instalada não é hls.js mas algo que o agente apelidou assim | Identificar a lib real |

---

## §2. Protocolo de investigação

Sequência obrigatória. **Não pular etapas.** Cada uma gera evidência que alimenta a próxima.

### 2.1 Etapa 1 — Inventário de dependências (~5min)

Em ambos os apps (web e mobile), executar:

```bash
cd <repo-root>

# Web
cat apps/web/package.json | grep -iE '"(stream|video|hls|mux|plyr|shaka|vime|jw)"' || echo "no matches web"

# Mobile
cat apps/mobile/package.json | grep -iE '"(stream|video|hls|mux|plyr|shaka|vime|jw|expo-av|expo-video|webview)"' || echo "no matches mobile"

# Lockfile cross-check (pega deps transitivas)
grep -iE '@cloudflare/stream|hls\.js|video\.js|mux-player|plyr|shaka' <lockfile> | head -30
```

Substituir `<lockfile>` por `package-lock.json`, `pnpm-lock.yaml`, ou `yarn.lock` conforme stack.

**Reportar:** lista exata de pacotes encontrados com versões em ambos apps.

### 2.2 Etapa 2 — Grep de URLs e imports (~10min)

```bash
# Procura URLs de Cloudflare Stream em todo o código
grep -rE 'cloudflarestream\.com|videodelivery\.net' apps/ --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx'

# Procura imports de SDKs de Stream
grep -rE "@cloudflare/stream|from ['\"]hls\.js" apps/ --include='*.ts' --include='*.tsx'

# Procura componentes de player
grep -rE '<(stream|Stream|Video|Player|Mux|Plyr)' apps/ --include='*.tsx' --include='*.jsx'

# WebView no mobile (sinal de fallback ruim)
grep -rE 'WebView|webview' apps/mobile/ --include='*.ts' --include='*.tsx'

# Variáveis de ambiente que indicam Stream config
grep -rE 'STREAM_|CLOUDFLARE_STREAM|CUSTOMER_(SUBDOMAIN|CODE)' apps/ .env*
```

**Reportar:** todos os hits, agrupados por categoria. Se aparecer URL Stream, listar arquivo + número da linha + 3 linhas de contexto antes/depois.

### 2.3 Etapa 3 — Identificar componente de player real (~15min)

Buscar componentes que renderizam vídeo:

```bash
grep -rE 'function.*Player|class.*Player|const \w+Player' apps/ --include='*.tsx' --include='*.jsx' -l
grep -rE '<video|videoRef|useVideoPlayer' apps/ --include='*.tsx' -l
```

Para cada arquivo encontrado, ler código completo e identificar:

1. **Source da URL do vídeo:** prop? API? Hardcoded? Que endpoint retorna?
2. **Engine:** import de hls.js? `@cloudflare/stream-react`? `expo-video`? `react-native-video`?
3. **UI:** componente nativo (`<video>`)? Lib externa (Plyr, video.js, Mux)?
4. **Branching condicional:** existe `if (videoSource === 'stream')` ou similar? Indica suporte multi-provider.

**Reportar:** árvore de chamadas do player. Exemplo:

```
VideoPlayer (apps/web/components/VideoPlayer.tsx)
├── useVideoSource() → fetch('/api/videos/:id') → retorna { url: string, type: 'stream' | 'r2' }
├── if type === 'stream':
│   └── <Stream src={url} /> (de @cloudflare/stream-react)
└── if type === 'r2':
    └── <video ref> + new Hls(url) (de hls.js)
```

### 2.4 Etapa 4 — Inspeção runtime (~15min)

#### 4.1 Web — DevTools

Em browser desktop, abrir página com player + DevTools:

1. **Elements tab:** identificar elemento que renderiza o vídeo. Reportar:
   - É `<iframe src="...">`? Qual src?
   - É `<video src="...">`? Qual src?
   - É `<stream>` (custom element)? Qual src?

2. **Network tab:** clicar play, observar requests. Reportar:
   - Domínios (ex: `customer-xxx.cloudflarestream.com`, CDN R2 do projeto, outro)
   - Tipos de arquivo (`.m3u8`, `.ts`, `.mp4`, `.webm`)
   - Existe request a `/manifest/video.m3u8` (Stream pattern) ou apenas `.m3u8` direto (R2 pattern)?

3. **Console:** mensagens da lib de player (hls.js logs específicos: "[HLS] ...", "[mediaSourceAttached]", etc.)

Repetir para **pelo menos 2-3 vídeos diferentes** (preferencialmente de épocas diferentes do projeto — um curso antigo e um novo).

#### 4.2 Mobile — RN DevTools

iOS Simulator + Safari Web Inspector OU Android + Chrome DevTools (`chrome://inspect`):

1. Verificar se há WebView no stack de componentes
2. Se WebView, qual URL está sendo carregada?
3. Se nativo, qual library?

Alternativa: abrir o app, reproduzir vídeo, capturar logs do RN debugger procurando por "stream", "hls", "video".

**Reportar:** capturas de tela quando viáveis, ou descrição textual detalhada.

### 2.5 Etapa 5 — Inventário de fontes no banco/API (~10min)

```bash
# Procura schema do banco
find apps/ -name 'schema.prisma' -o -name '*.sql' -o -name 'schema.ts' | xargs grep -lE 'video|asset|content' 2>/dev/null

# Procura endpoints que servem URLs de vídeo
grep -rE '/api/videos|/api/content|stream\.url|videoUrl|hlsUrl' apps/ --include='*.ts' --include='*.tsx'
```

Se houver banco com tabela `video` ou similar, **rodar query**:

```sql
SELECT 
  CASE 
    WHEN url LIKE '%cloudflarestream.com%' THEN 'stream'
    WHEN url LIKE '%videodelivery.net%' THEN 'stream'
    WHEN url LIKE '%.m3u8' THEN 'r2-direct'
    ELSE 'other'
  END AS source,
  COUNT(*) AS count
FROM videos  -- ajustar nome da tabela
GROUP BY source;
```

**Reportar:** breakdown de fonte por vídeo. Esta é a evidência DEFINITIVA de migração completa vs parcial.

---

## §3. Formato do relatório (post-investigação)

Após Etapas 1-5, gerar relatório nesta estrutura **antes de propor qualquer mudança de código**:

```markdown
## Diagnóstico Player Projeto Cirurgião

### Camada 1 — Storage (de onde vêm os bytes)
- Total de vídeos no banco: N
- Em Cloudflare Stream: X (Y%)
- Em R2: Z (W%)
- Outras fontes: ...

### Camada 2 — Engine de playback
- Web: [hls.js v3.x.x | @cloudflare/stream-react | nativo | hybrid]
- Mobile: [expo-video | react-native-video | WebView | hybrid]

### Camada 3 — UI Player
- Web: [componente custom | video.js | Mux Player | Plyr | iframe Stream | hybrid]
- Mobile: [VideoView do expo-video | controles custom | WebView UI]

### Hipótese confirmada
H1 / H2 / H3 / H4 / H5 / H6 / H7 / outro

### Evidências
- arquivo:linha — descrição
- ...

### Vídeos que quebram se hls.js for removido
- (lista CONCRETA com IDs e URLs, não "alguns")

### Plano de fix proposto
- ...
```

---

## §4. Plano de fix (decision tree)

A resposta à investigação determina o caminho. **Não decidir antes de evidência.**

### Caminho A — H1 confirmada (cosmético, sem resíduo Stream)
- Nenhuma mudança técnica necessária
- Documentar UI atual (qual lib, por quê)
- Trocar UI lib eventualmente é refactor, fora deste escopo

### Caminho B — H2/H4 confirmada (migração incompleta, vídeos no Stream)
1. Listar todos vídeos ainda em Stream
2. Migrar cada um: download Stream → re-encode local FFmpeg/NVENC se necessário → upload R2 → atualizar URL no banco
3. Validar playback de cada vídeo migrado antes do próximo
4. Após 100% migrados, remover branching condicional + `@cloudflare/stream-react` do package.json
5. Cancelar plano Cloudflare Stream se ainda ativo

**Reportar contagem ANTES de orçar custo de migração.**

### Caminho C — H3 confirmada (`@cloudflare/stream-react` instalado mas inútil)
1. Confirmar via grep + DevTools que nenhum vídeo de produção realmente usa
2. Remover do package.json
3. Remover imports e branching no código
4. Build + smoke test em ambos web e mobile

### Caminho D — H5 confirmada (mobile usa WebView com Stream)
1. Substituir WebView por `expo-video` (stack é Expo)
2. Apontar para URLs HLS R2
3. Validar adaptive bitrate switching (3G/4G/wifi)
4. Validar legendas Whisper carregam como `.vtt` track

### Caminho E — H6/H7 confirmada (player não é hls.js puro, ou é outra lib)
- Documentar arquitetura real
- Qualquer remoção de lib precisa de teste rigoroso por categoria de vídeo
- Não desinstalar nada antes de matriz de teste validar

---

## §5. Constraints (não-negociáveis)

1. **Modo B:** todas as mudanças de código passam por revisão de diff antes de commit. Sem auto-commit.
2. **Não desinstalar libs sem evidência empírica de não-uso.** Grep + DevTools + matriz de teste em vídeos reais.
3. **Não migrar vídeos do Stream em massa sem aprovação explícita.** Cada um custa banda + tempo. Reportar contagem e custo estimado antes de mover.
4. **Testar pelo menos 3 vídeos diferentes** (de épocas diferentes do projeto) antes de considerar fix validado.
5. **Web e mobile validados independentemente.** Mesmo bug pode ter raízes diferentes em cada plataforma.
6. **Sem refactor scope creep.** Se descobrir débito não relacionado, reportar como achado mas NÃO atacar nesta investigação.
7. **Reportar achados antes de improvisar fix.** Se algo do plano não fizer sentido com o que o agente encontrar, parar e reportar.

---

## §6. Out of scope

- **Outras dependências:** se `package.json` tiver outros débitos não relacionados a player de vídeo, ignorar
- **Performance optimization:** focar em correção, não otimização
- **UX redesign do player:** se UI atual funciona, manter
- **Backup strategy de R2:** problema separado
- **Re-encode de vídeos já em R2:** se renditions atuais funcionam, não tocar

---

## §7. Reporting

Após investigação completa (Etapas 1-5), retornar com relatório §3 preenchido + caminho recomendado de §4. Aguardar greenlight do owner antes de tocar qualquer arquivo de código.

Se durante investigação aparecer evidência de que o problema é mais profundo do que as 7 hipóteses cobrem, reportar imediatamente e aguardar direção.

---

**Stack legacy:** Cloudflare Stream (motivo da migração: ~$50k/year só pra delivery 4K)  
**Stack novo:** R2 + FFmpeg/NVENC + HLS + Whisper subtitles  
**Branch sugerida:** `fix/player-audit` (criar a partir do branch atual de produção)