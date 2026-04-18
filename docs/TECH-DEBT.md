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

<!-- Novos débitos adicionados aqui conforme forem descobertos ao longo do sprint. -->
