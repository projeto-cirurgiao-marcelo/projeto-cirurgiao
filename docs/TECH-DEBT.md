# Tech Debt

Registro vivo de débitos técnicos identificados fora do escopo do sprint
atual. Cada item deve ter: o que é, onde está, ação sugerida, impacto.

---

## Dead stack: video.js

- **Packages**: `video.js@8.23.7`, `videojs-contrib-quality-levels@4.1.0`,
  `videojs-hls-quality-selector@2.0.0`, `@videojs/http-streaming@3.17.4`
  (em `frontend-web/package.json`).
- **Player ativo**: `hls-video-element` + `hls.js` direto (em
  `frontend-web/src/components/video-player/hls-video-player.tsx`).
  Não há import de `video.js` nem de `videojs-*` em nenhum componente
  de produção.
- **Possível último consumidor**: `frontend-web/src/app/test-player/` —
  página isolada, possivelmente scratch de validação antiga.
- **Ação sugerida (próximo sprint)**:
  1. Confirmar com grep (`rg "from ['\"](video\\.js|videojs|@videojs)"`)
     que nenhum componente de produção importa da stack video.js.
  2. Se `test-player/` for o único consumidor, decidir se mantém como
     sandbox dev ou remove junto.
  3. Remover os 4 packages do `package.json` e rodar `npm install`
     pra atualizar lockfile.
  4. Remover `test-player/` se for só scratch.
- **Economia estimada**: ~2.5 MB no bundle, simplificação de deps,
  redução de vetor de CVE em deps transitivas.

---

## SECURITY-CRITICAL — CVEs abertas (fix mandatório no go-live)

Resultado consolidado de `npm audit --omit=dev` em `frontend-web/`
(2026-04-17). Paridade direta com os CVEs que B encontrou em
`mobile-app/` — mesmos pacotes (firebase transitive → protobufjs,
axios direto, follow-redirects transitive) + CVEs web-specific
(Next.js, @xmldom/xmldom).

### Dependências diretas

- **Next.js 15.3.6 → upgrade pra 15.3.8** antes do go-live.
  Resolve 10 CVEs reportados pelo scanner:
  - CVE-2025-66478 (CVSS 10.0, RCE não-autenticado, App Router)
  - CVE-2025-55184 (CVSS 7.5, DoS Server Components)
  - CVE-2025-55183 (CVSS 5.3, source code exposure Server Actions)
  - Cache key confusion em image optimization
  - Content injection em image optimization
  - Improper middleware redirect → SSRF
  - HTTP request smuggling em rewrites
  - Unbounded next/image disk cache
  - DoS via remotePatterns config
  - HTTP request deserialization DoS (RSC)

- **React 19.2.0 → upgrade pra 19.2.1** antes do go-live.
  - CVE-2025-55182 (CVSS 10.0, RCE React Server Components)

- **axios 1.13.2 → upgrade pra 1.16.0** antes do go-live.
  Resolve 3+ CVEs:
  - GHSA-43fc-jf86-j433 (HIGH, DoS via __proto__ em mergeConfig)
  - GHSA-3p68-rc4w-qgx5 (HIGH, NO_PROXY hostname bypass → SSRF)
  - GHSA-fvcv-3m26-pcqx (HIGH, cloud metadata exfiltration via
    header injection)
  - CVE-2025-62718 (CVSS 7.8, reportado recentemente — 1.15.0
    introduziu, 1.16.0 corrige).

- **Verificar CVE-2026-23864 em janeiro/2026** se usarmos
  `react-server-dom-*`. Checar se patch aplicado ou upgrade pra
  19.0.4 / 19.1.5 / 19.2.4.

### Dependências transitivas (vêm via firebase + outras)

- **protobufjs <7.5.5 → fix via `npm audit fix`** (upgrade
  automático da transitiva). **CRITICAL**.
  - GHSA-xq3m-2v4x-88gg (arbitrary code execution). Mesmo CVE
    que o mobile reportou.

- **follow-redirects <=1.15.11 → fix via `npm audit fix`**.
  MODERATE.
  - GHSA-r4q5-vmmm-2653 (leak de custom auth headers em
    cross-domain redirect). Mesmo que o mobile.

- **@xmldom/xmldom <0.8.12 → fix via `npm audit fix`**. HIGH.
  - GHSA-wh4c-j3r5-mjhp (XML injection via unsafe CDATA). Não
    aparece no mobile (não usa a transitiva).

### Procedimento de upgrade (ver DEPLOY.md §6)

Comando consolidado pré-release:

```bash
cd frontend-web
npm install next@15.3.8 react@19.2.1 react-dom@19.2.1 axios@1.16.0
npm audit fix --omit=dev
npm run build
```

**Rationale do adiamento**: produção ainda sem usuários reais, zero
dados de cliente expostos. Scanner automatizado encontra o endpoint,
mas upside pro atacante é zero. Fix incluído no checklist obrigatório
do go-live (`docs/DEPLOY.md §6 Pre-release dependency upgrade`).

---

<!-- Novos débitos adicionados aqui conforme forem descobertos ao longo do sprint. -->

