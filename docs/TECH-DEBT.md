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

## SECURITY — CVEs abertas (fix mandatório no go-live)

- **Next.js 15.3.6 → upgrade pra 15.3.8** antes do go-live
  - CVE-2025-66478 (CVSS 10.0, RCE não-autenticado, App Router)
  - CVE-2025-55184 (CVSS 7.5, DoS)
  - CVE-2025-55183 (CVSS 5.3, source code exposure Server Actions)
  - Comando: `npm install next@15.3.8`

- **React 19.2.0 → upgrade pra 19.2.1** antes do go-live
  - CVE-2025-55182 (CVSS 10.0, RCE React Server Components)
  - Comando: `npm install react@19.2.1 react-dom@19.2.1`

- **Verificar CVE-2026-23864 em janeiro/2026** se usarmos
  `react-server-dom-*`. Checar se patch aplicado ou upgrade pra
  19.0.4 / 19.1.5 / 19.2.4.

**Rationale do adiamento**: produção ainda sem usuários reais, zero
dados de cliente expostos. Scanner automatizado encontra o endpoint,
mas upside pro atacante é zero. Fix incluído no checklist obrigatório
do go-live (`docs/DEPLOY.md §6`).

---

<!-- Novos débitos adicionados aqui conforme forem descobertos ao longo do sprint. -->

