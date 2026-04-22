# Deploy — Mobile (`mobile-app/`)

Guia operacional pra Gustav rodar EAS builds nos 3 perfis. **Eu (teammate B)
sou agente headless — nao rodo `eas build` diretamente.** Este doc e o
checklist pra voce executar localmente quando quiser gerar um binario.

Projeto EAS: `c048ea29-2617-43af-a299-059c5d53b016` (slug `projeto-cirurgiao`,
owner `projetocirurgiao`). Bundle identifier iOS/Android: `com.projetocirurgiao.app`.

---

## 0. Pre-requisitos

- Node 20+ e `npm install -g eas-cli` (ou `npx eas-cli` — sem install global).
- Login no EAS: `eas login` (usa a mesma conta do `owner` em `app.json`).
- Apple Developer Program ativo (voce ja tem, confirmado pelo lider).
- Google Play Console com app registrado no bundle `com.projetocirurgiao.app`
  (se vai submeter pra Play). Servico account JSON exportado como
  `playstore-service-account.json` na raiz do `mobile-app/` (nao commitar —
  `.gitignore` cobre `*.json` suspeito, mas confirme).

---

## 1. Estrutura de perfis

Definidos em `mobile-app/eas.json`:

| Perfil | Distribuicao | API URL | Output |
|---|---|---|---|
| `development` | internal, dev client | `http://10.0.2.2:3000/api/v1` (localhost Android emulator) | dev client APK + iOS simulator build |
| `preview` | internal | Cloud Run producao | APK Android + `.ipa` ad-hoc iOS |
| `production` | store | Cloud Run producao | AAB Android + `.ipa` TestFlight/App Store |

`resourceClass: medium` (Android) e `m-medium` (iOS) por perfil — suficiente
pra nossa dep matrix (sem deps pesadas nativas).

`channel` por perfil pra EAS Update poder entregar OTA updates diferenciados
por ambiente (quando Gustav habilitar EAS Update — nao e agora).

---

## 2. Variaveis de ambiente

### `EXPO_PUBLIC_API_URL`
- Hoje hardcoded em `eas.json` por perfil (publico — e so a URL da API).
- `EXPO_PUBLIC_*` e **inlined no bundle JS** — nao e segredo. OK ficar em
  `eas.json` commitado.

### Firebase config files (secrets de verdade)
- `GoogleService-Info.plist` (iOS) e `google-services.json` (Android) sao
  referenciados em `app.json` mas **NAO estao no worktree**. `.gitignore`
  cobre.
- **Acao obrigatoria antes de cada build:** garantir que os dois arquivos
  estao no `mobile-app/` local (voce pode baixar do Firebase Console ou
  manter na sua maquina). Se faltarem, EAS build **falha silenciosamente
  no plugin de Firebase**.
- Alternativa: configurar como EAS File (ver abaixo).

### EAS Secrets (sensiveis + automatizaveis)

Pra secrets que devem ser lidos durante build sem ficar em `eas.json`:

```bash
# Configurar uma vez:
eas secret:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
eas secret:create --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist

# Listar:
eas secret:list

# Deletar:
eas secret:delete --name NOME_DO_SECRET
```

Depois, no `eas.json` em cada perfil, adicionar:
```json
"env": {
  "GOOGLE_SERVICES_JSON": "$GOOGLE_SERVICES_JSON",
  "GOOGLE_SERVICE_INFO_PLIST": "$GOOGLE_SERVICE_INFO_PLIST"
}
```

E atualizar `app.json` pra ler de env vars (EAS substitui na build):
```json
"android": { "googleServicesFile": "$GOOGLE_SERVICES_JSON" }
```

**Nao implementado neste commit** porque exige confirmar com voce qual
caminho (file local vs EAS secret). Se preferir, faco num PR seguinte.

---

## 3. Comandos

### Development build (dev client com hot reload)

```bash
cd mobile-app

# Android emulator:
eas build --profile development --platform android

# iOS simulator:
eas build --profile development --platform ios

# Ambos:
eas build --profile development --platform all
```

Depois de gerar, instalar o dev client no device/emulator. Rodar metro com
`npx expo start --dev-client`. Eventuais mudancas nativas exigem rebuild.

### Preview build (binario distribuivel internamente)

```bash
cd mobile-app

# Android APK interno:
eas build --profile preview --platform android

# iOS ad-hoc (instalavel via UDID registrado no perfil):
eas build --profile preview --platform ios

# Ambos:
eas build --profile preview --platform all
```

Links de install gerados pelo EAS. Ideal pra QA interno + Gustav testar em
device antes de submit pra store.

### Production build (pra store submission)

```bash
cd mobile-app

# Android AAB pra Google Play:
eas build --profile production --platform android

# iOS pra TestFlight + App Store:
eas build --profile production --platform ios

# Ambos:
eas build --profile production --platform all
```

`autoIncrement: true` bumpa `versionCode`/`buildNumber` automaticamente a
cada build. `appVersionSource: "remote"` mantem versao semver controlada
pelo EAS (nao pelo `app.json`) — consulta via `eas build:version:get`.

---

## 4. Submit pra stores

### iOS — TestFlight / App Store

```bash
eas submit --profile production --platform ios
```

Secao `submit.production.ios` em `eas.json` esta com placeholders
`CONFIGURAR_VIA_EAS_SECRETS`. Voce tem 2 opcoes:

**(a) Interativo** (recomendado primeira vez): remover os 3 campos, o
EAS CLI vai pedir apple ID / ASC app ID / team ID e salvar no seu
`~/.eas-config`.

**(b) EAS Secrets**:
```bash
eas secret:create --name APPLE_ID --value seu-apple-id@email.com
eas secret:create --name ASC_APP_ID --value 1234567890
eas secret:create --name APPLE_TEAM_ID --value ABCDEFGHIJ
```

Depois atualizar `eas.json` com `"$APPLE_ID"` etc nos 3 campos.

### Android — Google Play

```bash
eas submit --profile production --platform android
```

Exige `playstore-service-account.json` no `mobile-app/` (service account
do GCP com role `Service Account User` no Play Console). `track: internal`
primeiro pra validar, depois promove manualmente pra `alpha` / `beta` /
`production` no Play Console.

---

## 5. Troubleshooting

### "Plugin expo-video not found" durante build
- Garante que `npm install` rodou localmente primeiro (gera `package-lock.json`
  atualizado). EAS resolve lockfile no cloud, mas lockfile fora-de-sync quebra.

### "GoogleService-Info.plist not found"
- Arquivo ausente no `mobile-app/`. Baixa do Firebase Console (Project
  Settings -> iOS apps -> Download GoogleService-Info.plist).

### iOS build falha em assinatura
- Primeira build: `eas credentials` pra configurar certificado + provisioning
  profile. EAS Managed Credentials resolve sozinho se voce autorizar Apple
  Developer login.

### Android build falha em keystore
- Primeira build: EAS gera keystore managed automaticamente. Backup do
  keystore e **critico** (perder = nao consegue atualizar o app na Play).
  `eas credentials -p android` pra baixar backup.

### Bundle size grande (>30MB Android)
- Hoje sem WebView + sem deps pesadas nativas. Se crescer acima de 30MB,
  revisar `assets/` e considerar remover ativos nao usados.

---

## 6. Checklist antes de cada production build

- [ ] `git status` clean (nenhum arquivo unstaged).
- [ ] Testado em dev client + preview build em device fisico (Android + iOS).
- [ ] `TECH-DEBT.md` sem itens criticos abertos.
- [ ] `STORE-RELEASE.md` completo (screenshots, descricao, politica).
- [ ] Firebase config files presentes (`GoogleService-Info.plist`,
      `google-services.json`).
- [ ] Play Console service account JSON presente (se submetendo pra Android).
- [ ] Versao semver em `app.json` bumpada se significativo (ex: 1.0.0 -> 1.0.1).
- [ ] Release notes rascunhados pra TestFlight + Play Internal.

---

## 7. Debito documentado

Ver `docs/TECH-DEBT.md`:
- EAS Secrets pra Firebase configs (nao implementado — caminho atual e
  arquivos locais no `mobile-app/`).
- `npm audit --production` antes de go-live (bloqueio: CVEs altos).
- Sentry / Crashlytics pra crash reports em builds de producao.
