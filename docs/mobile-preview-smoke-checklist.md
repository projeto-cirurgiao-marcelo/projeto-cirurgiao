# P1.5 — Checklist de build preview + smoke em device real (execução manual)

Gate final do go-live controlado. **Execução manual pelo Gustavo** — o agente é
headless e não roda `eas build`. Comandos abaixo são **modelos**.

> ## Status da execução
> | Plataforma | Build preview | Smoke device físico |
> |---|---|---|
> | **iOS** | ✅ passou (`app.projetocirurgiao.mobile`) | ✅ aprovado |
> | **Android** | N/A neste go-live | N/A neste go-live |
>
> - **P1.5 CONCLUÍDO (escopo iOS-only).** **Android está fora do escopo deste release** (decisão do Gustavo, 2026-07-02) — exigirá ciclo próprio quando entrar no escopo.
> - Sentry auto-upload desabilitado nos builds EAS (`SENTRY_DISABLE_AUTO_UPLOAD=true`).
> - Firebase iOS: ✅ app `app.projetocirurgiao.mobile` cadastrado + `GoogleService-Info.plist` atualizado; novo build reinstalado e aprovado em device.

Projeto EAS: slug `projeto-cirurgiao`, owner `projetocirurgiao`.
Bundle iOS: `app.projetocirurgiao.mobile` — Android package: `com.projetocirurgiao.app`.

> ✅ **Firebase iOS (resolvido):** app `app.projetocirurgiao.mobile` cadastrado no
> Firebase e `GoogleService-Info.plist` (gitignored — não versionado) atualizado
> com o novo bundle. Novo build iOS preview reinstalado em device físico e
> aprovado. (Login já funcionava via Firebase JS SDK / `EXPO_PUBLIC_FIREBASE_*`;
> o plist correto deixa builds nativos consistentes.)

---

## 1. Pré-requisitos

- [ ] **Acesso EAS** — `eas login` (mesma conta do `owner` em `app.json`).
- [ ] **Credenciais de store** conforme a plataforma alvo:
  - iOS: Apple Developer Program ativo (assinatura ad-hoc do perfil `preview`).
  - Android: keystore EAS (gerada/gerenciada pelo EAS).
- [ ] **`EXPO_PUBLIC_API_URL` → backend de produção.** Já vem embutido no perfil
  `preview` do `eas.json`:
  `https://projeto-cirurgiao-api-81746498042.southamerica-east1.run.app/api/v1`.
  Confirmar que o backend prod está no ar (`/api/v1/health` → `{"status":"ok"}`).
- [ ] **DSNs Sentry (opcionais).** Sem `EXPO_PUBLIC_SENTRY_DSN`, o Sentry é no-op
  (sem erro). Se quiser validar captura, exportar o DSN antes do build.
- [ ] **Device físico** disponível (iPhone e/ou Android real — não só emulador,
  pra valer como aceite).
- [ ] **Conta de teste** válida no backend de produção (login real; não usar
  seed de staging contra prod).

---

## 2. Build preview

```bash
cd mobile-app
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

Perfil `preview` (de `eas.json`): distribuição `internal`, Android `apk`,
iOS `.ipa` ad-hoc — instaláveis direto no device.

### ⚠️ Gotcha monorepo (EAS estoura o limite de upload)

O repo inteiro passa de 10GB (backend-api, frontend-web, `.git`); o limite do
EAS é 2GB e o `.easignore` **não** funciona quando existe `.git`. Buildar de uma
**cópia isolada**:

```bash
# 1. Copiar só o mobile-app pra fora do monorepo
cp -r mobile-app/* D:/dashboard/eas-build-temp/
cd D:/dashboard/eas-build-temp

# 2. Limpar artefatos que quebram o upload/git
rm -rf node_modules .git
#    (remover também um arquivo chamado `nul` se existir — nome reservado no Windows)

# 3. Reinstalar preservando as versões pinadas (P1.8) — usar ci, não install
#    (garantir que package-lock.json, app.json e eas.json vieram na cópia)
npm ci

# 4. Buildar de dentro da pasta temp (EAS faz git init sozinho)
eas build --profile preview --platform android
```

> **Preservar lockfile/config:** copiar `package-lock.json`, `app.json`,
> `eas.json` junto e rodar `npm ci` (não `npm install`) — as deps de styling
> estão em pin exato de propósito (NativeWind v5 preview / react-native-css
> nightly, ver `mobile-app/docs/DEPLOY.md §1.1`). `npm install` poderia mexer no
> resolvido.

---

## 3. Matriz de smoke (rodar em cada device instalado)

| # | Fluxo | iOS | Android | Notas |
|---|---|---|---|---|
| 1 | Instalação do app (abre sem crash) | ☐ | ☐ | |
| 2 | Login (conta de teste) | ☐ | ☐ | fala com backend prod |
| 3 | Persistência: fechar e reabrir → segue logado | ☐ | ☐ | |
| 4 | **SecureStore (P0.6):** usuário já logado pode **deslogar 1×** após a migração (esperado); no 2º login em diante persiste normal | ☐ | ☐ | risco conhecido, não é bug |
| 5 | Player HLS (dar play, seek) | ☐ | ☐ | R2 HLS |
| 6 | Legenda pt-BR aparece/alterna | ☐ | ☐ | |
| 7 | Quiz: responder e ver resultado | ☐ | ☐ | |
| 8 | **Double-tap no quiz (P0.5):** dois toques rápidos = **uma** submissão/XP | ☐ | ☐ | guard já no código |
| 9 | XP / gamificação (ganho, animação) | ☐ | ☐ | |
| 10 | Fórum (listar, abrir tópico) | ☐ | ☐ | |
| 11 | Chat / RAG (enviar pergunta, receber resposta) | ☐ | ☐ | |
| 12 | Logout (limpa sessão; volta pro login) | ☐ | ☐ | |
| 13 | Offline / rede ruim básico: banner offline; sem crash ao voltar rede | ☐ | ☐ | se viável |

> **Sentry (se DSN setado):** conferir no painel que um erro forçado aparece e
> que **Authorization/tokens saem como `[Redacted]`** (P1.16). Se DSN não setado,
> pular.

---

## 4. Critérios de aceite

- [ ] **iOS preview** aprovado **ou** risco documentado (o que falhou + severidade).
- [ ] **Android preview** aprovado **ou** risco documentado.
- [ ] **Bugs listados** com severidade (bloqueante / alto / médio / baixo).
- [ ] **Gustavo aprova ou bloqueia** o go-live controlado com base neste smoke.

### Registro de bugs (preencher na execução)

| Sev | Plataforma | Fluxo (#) | Descrição | Ação |
|---|---|---|---|---|
| | | | | |

---

**Referência:** este documento é o item **P1.5** do
`docs/plans/2026-06-30-p0-p1-go-live-checklist.md` (gate final). Ao concluir,
marcar P1.5 lá com o resultado (aprovado / bloqueado + link pros bugs).
