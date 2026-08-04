# Estudo — Paridade Android vs. build iOS atual

> **Data:** 2026-07-30
> **Escopo:** estudo e relatório. Nenhum código alterado, nenhum build submetido a loja,
> nenhuma mudança de config em serviços externos. Diagnóstico local permitido e usado
> (prebuild + compilação local do APK debug).
> **Contexto:** o go-live controlado foi iOS-only por decisão de 2026-07-02
> (`docs/plans/2026-06-30-p0-p1-go-live-checklist.md`, P1.5 e "Notas de risco aceito").
> Este doc mapeia o que falta para o Android **buildar, rodar e parear** com a versão
> iOS que está em TestFlight.

---

## 1. Sumário executivo

**O Android está muito mais perto do que o status "fora de escopo" sugere.** O projeto
nativo Android gera sem erro de plugin, o package Android já existe e está cadastrado no
Firebase `projeto-cirurgiao-e8df7`, e a superfície de código realmente específica de
plataforma é pequena (16 ocorrências de `Platform.OS`/`Platform.select` em todo o app,
quase todas com fallback Android já escrito).

O que separa o Android de um preview instalável não é reescrita — é **um bloco de
toolchain, um bloco de credenciais externas (Gustavo) e três blocos de acabamento de
plataforma** (player/orientação, permissões, UI edge-to-edge). Nenhum deles é de risco
arquitetural.

**O achado que mais muda o plano: o Android já compila.** Rodei o build de verdade nesta
sessão — `./gradlew assembleDebug` → **BUILD SUCCESSFUL em 33 min**, APK debug de 240 MB
gerado, 582 tasks, zero erro (§5.2). Com a New Architecture ligada e as 40+ libs Expo do
projeto. **Não há bloqueador de build a descobrir.** Tudo que resta é runtime,
conformidade de loja e acabamento.

Os outros três achados relevantes:

1. **`expo-screen-orientation@55.0.13` está instalado num projeto Expo SDK 54** (esperado
   `~9.0.9`) — mismatch de *major* num módulo nativo, justamente o que controla o
   fullscreen do player. Como a compilação passou, **isto não é bloqueador de build** como
   eu esperava antes de rodar: é risco de **runtime** (comportamento divergente ou crash
   ao girar/entrar em fullscreen) e higiene de dependência.
2. **O manifest Android trava a activity em `android:screenOrientation="portrait"`.** O
   auto-fullscreen por rotação do `VideoPlayer` (`VideoPlayer.tsx:449-470`) depende de o
   sistema reportar mudança de orientação — com a activity travada, esse caminho
   provavelmente não dispara no Android. É o maior risco de divergência funcional visível.
3. **O app declara `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`**
   no manifest Android — herdadas do `expo-av`, que o app usa só para tocar efeitos
   sonoros. Num app de educação que não grava áudio, isso é fricção real no Play Console
   (Data Safety + revisão) e deve ser limpo **antes** de submeter, não depois. De quebra,
   o mesmo `expo-av` esconde um bug funcional: a detecção de fone de ouvido usa nomes de
   porta do iOS, então os **efeitos sonoros do quiz provavelmente ficam mudos no Android**
   (detalhe em AND-4).

**Dois "riscos conhecidos" da premissa do pedido se dissolveram na verificação:**

- **O gotcha do monorepo (copiar `mobile-app/` para pasta temp) não vale mais.** O repo
  canônico tem 898 arquivos rastreados / 3,2 MB e `.git` com 9,9 MiB de pack. Não há nada
  perto do limite de upload do EAS. Detalhes e ressalva em §5.1.
- **`ios-tests.yml` não está órfão.** O conteúdo já foi corrigido: é um job Jest
  agnóstico de plataforma (`name: Mobile Tests`) rodando em `mobile-app/`. Só o **nome do
  arquivo** ficou legado. É rename, não trabalho.

**Estado do teste automatizado:** `npm test` verde — 16 suites, 56 testes (rodado nesta
sessão).

---

## 2. O que já funciona sem mudança

Cada item abaixo foi verificado no código ou na config gerada, não presumido.

| Área | Evidência |
|---|---|
| **O app compila para Android** | `./gradlew assembleDebug` → `BUILD SUCCESSFUL in 33m`, 582 tasks, APK gerado. Rodado nesta sessão (§5.2). |
| **Package Android definido** | `app.json` → `android.package: com.projetocirurgiao.app`. |
| **App Android cadastrado no Firebase** | `google-services.json` local: `project_id: projeto-cirurgiao-e8df7`, `project_number: 81746498042`, client com `package_name: com.projetocirurgiao.app` — bate com o `app.json`. |
| **Auth funciona igual nas duas plataformas** | O app usa o **Firebase JS SDK** (`firebase` npm), não `@react-native-firebase`. Config vem de `EXPO_PUBLIC_FIREBASE_*` (`src/services/firebase.ts`), o mesmo caminho no iOS e no Android. Custom token / ID token não têm código por plataforma. |
| **Perfis EAS Android existem** | `eas.json` tem bloco `android` nos 3 perfis (`development`/`preview`/`production`), com `buildType: apk` no preview e `resourceClass: medium`. |
| **Adapter SecureStore (P0.6) é seguro no Android** | `src/lib/secure-storage.ts` faz chunking em 1800 chars e hex-encode da chave — o comentário do próprio arquivo cita o limite (~2048 bytes) que **é o do Android**; o iOS é mais permissivo. O código foi escrito para o caso Android. Além disso, `expo-secure-store` já injeta `@xml/secure_store_backup_rules` e `@xml/secure_store_data_extraction_rules` no manifest gerado, evitando que o material de auth vaze via backup/transfer do Android. |
| **Fallback de ActionSheet** | `app/courses/catalog.tsx:165` já tem caminho Android (`Alert.alert` com opções). |
| **Sombras** | Todo arquivo que usa `shadowOpacity`/`shadowRadius` também usa `elevation` (16/16 arquivos). Nenhuma sombra some no Android. |
| **`expo-glass-effect` (Liquid Glass) não quebra o Android** | O pacote não tem pasta `android/` (nada a autolinkar) e o build web/Android resolve `GlassView.js` → `<View {...props}/>` e `isLiquidGlassAvailable()` → `false`. O `app/(tabs)/_layout.tsx:100` já ramifica nesse booleano. |
| **Haptics** | `VIBRATE` está no manifest gerado; `src/hooks/useHaptic.ts` é o único consumidor e não tem código por plataforma. |
| **Deep link** | Scheme `projetocirurgiao` registrado no `intent-filter` do `MainActivity`. Paridade com iOS (nenhuma das duas plataformas usa App Links / Universal Links hoje). |
| **CI mobile** | `.github/workflows/ios-tests.yml` roda `npm ci && npm test` em `mobile-app/` — já cobre Android por ser agnóstico. |
| **Sem fontes customizadas** | Nenhum `useFonts`/`loadAsync` de fonte — zero risco de asset de fonte faltando no Android. |
| **LayoutAnimation já habilitada no Android** | `app/profile/faq.tsx:24` faz o `UIManager.setLayoutAnimationEnabledExperimental(true)` sob `Platform.OS === 'android'`. Alguém já pensou no Android aqui. |
| **Fonte monoespaçada do quiz** | `src/components/quiz/QuestionCard.tsx:30` usa `Platform.select({ ios: 'Menlo', android: 'monospace' })`. |
| **Target API level** | SDK 54 entrega `compileSdk`/`targetSdk` 36 via `expo-root-project`. Acima do mínimo exigido pelo Play em 2026. Sem gap. |

---

## 3. Gap list priorizada (blocos independentes)

Cada bloco é candidato a branch/ciclo próprio. A ordem é de dependência real: **AND-1 e
AND-2 destravam todo o resto**; AND-3..AND-5 são paralelizáveis entre si; AND-6..AND-8
podem correr em background.

### 🟠 AND-1 — Toolchain: alinhar deps nativas ao SDK 54

**Por quê:** não trava o build (a compilação local passou), mas deixa um módulo nativo de
outra linha de SDK dentro do runtime — e é o módulo do player.

**Evidência (`npx expo-doctor`, rodado nesta sessão):**

```
✖ Check that packages match versions required by installed Expo SDK
❗ Major version mismatches
package                         expected  found
expo-screen-orientation         ~9.0.9    55.0.13
⚠️ Minor: @react-native-community/slider  5.0.1 → 5.2.0
🔧 Patch: expo-glass-effect ~0.1.10 → 0.1.9 | expo-linking ~8.0.12 → 8.0.11
```

`expo-screen-orientation@55.x` é a linha do **SDK 55**. Num app SDK 54 isso significa
código nativo de outra geração convivendo com o resto do runtime Expo. **Compila nos dois
lados** — o iOS está em TestFlight e o APK Android saiu nesta sessão — então o risco não é
de build, é de comportamento: a API de orientação é exatamente a que o auto-fullscreen
usa, e é o tipo de divergência que só aparece girando o device.

**Escopo:** `expo install --check` para os 4 pacotes; validar que o fullscreen do player
continua funcionando no **iOS** (regressão possível — `expo-screen-orientation` é
justamente o que o `VideoPlayer` usa) e só então no Android.

**Cuidado:** este bloco toca o iOS que já está validado. Precisa de re-smoke iOS, não só
Android. Não misturar com outro bloco.

---

### 🔴 AND-2 — Credenciais e segredos de build Android (depende do Gustavo)

**Por quê:** sem isso não sai binário, independentemente do código.

**O que não consegui verificar e por quê:** a conta EAS logada nesta máquina
(`deixaapp`) **não tem permissão de leitura no projeto EAS** do app:

```
$ eas build:list --platform android --limit 5 --non-interactive
Entity not authorized: AppEntity[c048ea29-2617-43af-a299-059c5d53b016]
(viewer = RegularUserViewerContext[877c8d16-...], action = READ)
```

Portanto **não sei** se já existe keystore Android gerado no EAS, nem se as variáveis
`EXPO_PUBLIC_FIREBASE_*` estão registradas como EAS env vars. Isso vira pré-requisito
(§6), não achado.

**O que dá para afirmar do lado do repo:**

- `eas.json` define **apenas** `EXPO_PUBLIC_API_URL` no `env` dos perfis. As 7 variáveis
  `EXPO_PUBLIC_FIREBASE_*` que o `src/services/firebase.ts` lê **não estão lá**.
- Elas existem no `mobile-app/.env` local, que é gitignored — **mas o `.easignore` não o
  ignora**, e quando existe `.easignore` o EAS usa ele no lugar do `.gitignore`. Ou seja,
  hoje o `.env` (e o `google-services.json`, e o `GoogleService-Info.plist`) **sobem no
  tarball de build**. É muito provavelmente por isso que o build iOS funcionou sem EAS
  secrets.
- Consequência prática: **o Android herda o mesmo mecanismo e deve funcionar igual** —
  desde que o build rode a partir de um diretório que tenha esses arquivos em disco.
- Consequência de higiene: o tarball de build carrega `.env` e os arquivos Firebase. As
  chaves `EXPO_PUBLIC_*` já vão inlined no bundle JS de qualquer forma (não são segredo),
  mas isso deve ser uma decisão consciente e não um efeito colateral do `.easignore`.
  Migrar para EAS secrets/env vars é o caminho já documentado em `mobile-app/docs/DEPLOY.md §2`.

**Escopo:** decidir mecanismo (env local vs. EAS env vars), confirmar/gerar keystore
Android no EAS, primeiro `eas build --profile preview --platform android`.

---

### 🟠 AND-3 — Player: orientação, fullscreen e legendas no Android

**Por quê:** é a divergência funcional visível mais provável, e o player é o coração do produto.

**Evidência 1 — a activity está travada em portrait.** Manifest gerado por
`npx expo prebuild --platform android` (`android/app/src/main/AndroidManifest.xml`):

```xml
<activity android:name=".MainActivity"
  android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode"
  android:screenOrientation="portrait"
  android:supportsPictureInPicture="true" ... >
```

Vem de `"orientation": "portrait"` no `app.json`. O `VideoPlayer.tsx:449-470` implementa
auto-fullscreen assim:

```ts
const subscription = ScreenOrientation.addOrientationChangeListener((evt) => {
  ...
  if (isLandscape && !isFullscreenRef.current) videoViewRef.current?.enterFullscreen();
  else if (isPortrait && isFullscreenRef.current) videoViewRef.current?.exitFullscreen();
});
```

Com `screenOrientation="portrait"` no manifest, o Android não gira a activity, então o
listener tende a nunca ver `LANDSCAPE_*` — o auto-fullscreen ao girar o device
provavelmente **não dispara**. O botão explícito de fullscreen (`requestFullscreen`, que
chama `lockAsync(LANDSCAPE)` em runtime) tende a funcionar, porque `setRequestedOrientation`
sobrepõe o manifest. **Precisa de device físico para confirmar qual dos dois caminhos vive.**

**Evidência 2 — PiP declarado sem código.** `android:supportsPictureInPicture="true"`
entra no manifest via o plugin `expo-video` (`app.json` → `supportsPictureInPicture: true`),
mas não há chamada de auto-enter PiP no código. No Android, PiP não acontece sozinho —
declarar sem implementar é inconsistência silenciosa, não bug.

**Evidência 3 — legendas.** O fluxo de legendas usa
`player.availableSubtitleTracks` / `player.subtitleTrack` (`VideoPlayer.tsx:138-148, 275-279`),
sem código por plataforma. No Android isso é servido pelo **ExoPlayer** e no iOS pelo
**AVPlayer**: a API do `expo-video` é a mesma, mas quando e como as tracks do HLS R2
aparecem (`subtitles_pt.vtt` + `subtitles.m3u8` no master playlist) difere entre os dois
engines. Não é um bug conhecido — é o item que mais precisa de smoke real.

**Escopo:** decidir a política de orientação (`orientation: "default"` + lock por tela, ou
manter portrait e aceitar só o botão), smoke de legendas em device, decidir PiP
(implementar ou remover a flag).

---

### 🟠 AND-4 — Permissões do manifest e conformidade Play

**Por quê:** bloqueia a submissão, não o build — mas é barato agora e caro depois de já
ter listing publicado.

**Evidência (manifest gerado):**

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-permission android:name="android.permission.INTERNET"/>
```

E o manifest **mesclado** (o que de fato vai no APK — `android/app/build/outputs/logs/manifest-merger-debug-report.txt`,
produzido pela compilação local) acrescenta o que as libs injetam:

```
ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE     ← @react-native-community/netinfo
USE_BIOMETRIC, USE_FINGERPRINT              ← expo-secure-store
```

`RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `READ/WRITE_EXTERNAL_STORAGE` e
`SYSTEM_ALERT_WINDOW` vêm do config plugin do **`expo-av`**, cujo uso real no app é
mínimo: `src/hooks/useSound.ts` (efeitos sonoros) e `src/hooks/useAudioOutput.ts`
(probe de saída de áudio). O app **não grava áudio**.

`USE_BIOMETRIC`/`USE_FINGERPRINT` são legítimas (vêm do SecureStore, que é o P0.6) mas
aparecem na lista pública de permissões do listing — vale saber que estão lá antes de
alguém perguntar.

Impacto: no Play Console, `RECORD_AUDIO` puxa declaração de uso de microfone no Data
Safety e atenção extra na revisão. `SYSTEM_ALERT_WINDOW` (overlay) idem. Pedir microfone
num app de vídeo educacional sem funcionalidade de gravação é o tipo de coisa que gera
rejeição ou pedido de esclarecimento.

**Bônus deste mesmo bloco — um bug funcional silencioso no Android.** `useAudioOutput.ts`
detecta fone de ouvido comparando contra nomes de porta do **AVAudioSession do iOS**
(`BluetoothA2DP`, `WiredHeadphones`, `LineOut`…), via feature-probe com fallback `false`.
No Android esse probe deve sempre cair no fallback. E `useSound.ts:27` faz:

```ts
if (audioPreference === 'AUTO' && !headphonesConnected) return;   // AUTO é o default
```

Ou seja: com a preferência padrão, **os efeitos sonoros do quiz provavelmente nunca tocam
no Android**. Não crasha, não loga — simplesmente não há som. Exatamente o tipo de coisa
que passa despercebida num smoke rápido.

**Escopo (duas saídas possíveis):** migrar `expo-av` → `expo-audio` (estável no SDK 54,
`expo-av` está deprecado) — solução de raiz, que também paga débito técnico e é a
oportunidade natural de corrigir o `useAudioOutput`; **ou** `android.blockedPermissions`
no `app.json` — solução de 15 minutos que resolve só as permissões e deixa o bug do som.
Recomendo a migração; o consumo é pequeno (2 hooks, ambos já com teste).

---

### 🟡 AND-5 — Acabamento visual e navegação Android

**Por quê:** nada aqui impede o app de rodar; tudo aqui aparece na primeira captura de tela.

| Item | Evidência | Impacto |
|---|---|---|
| **Blur não existe no Android hoje** | `app/(tabs)/_layout.tsx:216` cai no fallback `<BlurView intensity={65} tint="systemChromeMaterial">` quando não há Liquid Glass; o `VideoPlayer.tsx:7` usa `BlurView` nos menus de velocidade/CC. Os tipos do pacote instalado são explícitos: `experimentalBlurMethod` — *"Blur method to use on Android… `@default 'none'`"* (`node_modules/expo-blur/build/BlurView.types.d.ts:37-46`). Sem passar essa prop, **não há blur nenhum no Android**. `systemChromeMaterial` também é um tint iOS. | **Confirmado, não suspeita.** Tab bar e menus do player renderizam como retângulos translúcidos chapados. Cosmético, mas é a primeira coisa que se vê. A própria doc do Expo marca o método Android como experimental (perf/glitches) — pode ser que a decisão certa seja um fundo sólido no Android em vez de blur. |
| **Edge-to-edge** | `gradle.properties` gerado: `edgeToEdgeEnabled=true` e `expo.edgeToEdgeEnabled=true` (padrão do SDK 54). Nunca validado visualmente no Android. | Conteúdo desenha atrás das barras de sistema. A tab bar já usa `useSafeAreaInsets()` com fallback `MIN_BOTTOM` para Android (`_layout.tsx:101`), o que é bom sinal — mas as demais telas precisam de varredura. |
| **Dark mode do sistema** | O prebuild avisou: `» android: userInterfaceStyle: Install expo-system-ui in your project to enable this feature.` Ou seja, `"userInterfaceStyle": "light"` **não é aplicado no Android**. O app não usa `useColorScheme`/`Appearance` em lugar nenhum — é light-only por design. | Com o device em dark mode, componentes **nativos** (diálogos `Alert`, `TextInput`, WebView dos DOM components) podem vir escuros contra uma UI clara. Isso conecta com a "auditoria dark mode" que já estava pendente da rodada de feedback de julho. |
| **Botão voltar do sistema** | Manifest: `android:enableOnBackInvokedCallback="false"`; nenhum `BackHandler` em todo o código (`grep` = 0 ocorrências). | O back físico/gestual do Android navega para trás sem interceptação. Em fluxo de quiz ou vídeo em fullscreen, isso pode descartar estado sem confirmação. O iOS não tem esse gesto equivalente, então **é um caminho de código que nunca foi exercitado**. |
| **DOM components / WebView (quiz)** | `DrGelpiDOM.tsx` e `GelpiCelebrateModalDOM.tsx` (`'use dom'`), montados com `dom={{ scrollEnabled: false, contentInsetAdjustmentBehavior: 'never', style: { ..., backgroundColor: 'transparent' } }}`. `contentInsetAdjustmentBehavior` é iOS-only (inócuo no Android). | O ponto de atenção é **transparência do WebView no Android**, historicamente inconsistente com o `react-native-webview`, e performance das animações SVG/CSS num WebView Android de gama baixa. Precisa de olho em device real, de preferência não-flagship. |

---

### 🟡 AND-6 — Assets Android e rebranding

**Estado atual (verificado):** `icon.png`, `adaptive-icon.png` e `splash-icon.png` todos
**1024×1024**; `favicon.png` 48×48. O `adaptiveIcon` está configurado com background
`#FFFFFF`.

**Gaps:**

- **Safe zone do adaptive icon não verificada.** O Android recorta o foreground em
  círculo/squircle/etc.; o conteúdo precisa caber em ~66% central (≈690px de 1024). Se a
  logo atual encosta nas bordas, o launcher corta.
- **Ícone monocromático ausente** (`monochromeImage`) — usado pelo Material You no
  Android 13+. Opcional, mas é o tipo de detalhe que diferencia app "portado" de app nativo.
- **Splash em config legada.** `app.json` usa o bloco `splash` top-level; o caminho
  suportado no SDK 54+ é o plugin `expo-splash-screen`, e o legado sai no SDK 55.
- **Rebranding pendente.** Há logos novas não versionadas em `docs/novas logos/`
  (`Group 1.svg`, `Group 8.svg`) e `logobranca.svg` na raiz. Como o Android ainda não tem
  assets "aprovados em produção", **este é o momento mais barato de aplicar o rebranding**:
  gerar ícone base + adaptive (foreground/background/monochrome) + splash de uma vez, para
  as duas plataformas. Fazer o rebranding depois significa refazer o listing da loja.

---

### 🟢 AND-7 — Caminho até a Play Store (só mapeamento)

`mobile-app/docs/STORE-RELEASE.md` já cobre o fluxo Android (§1 assets, §2 metadata, §3
Data Safety, §5 Play Internal → Production). O que **não** existe hoje:

| Requisito | Estado |
|---|---|
| Conta Google Play Console (taxa única de US$ 25) | ❌ não confirmada — pré-requisito Gustavo |
| App registrado no package `com.projetocirurgiao.app` | ❌ não confirmado |
| Play App Signing (chave de upload gerenciada pelo EAS) | ❓ não verificável sem acesso ao projeto EAS |
| `playstore-service-account.json` para `eas submit` | ❌ ausente. `eas.json` já aponta `serviceAccountKeyPath: "./playstore-service-account.json"`, `track: "internal"` — o caminho está configurado, o arquivo não existe |
| Feature graphic 1024×500 (obrigatório no Play, não existe no iOS) | ❌ a produzir |
| Screenshots phone portrait (mín. 2) | ❌ a produzir |
| Data Safety + Content Rating (IARC) | ❌ a preencher — **depende de AND-4**, já que declarar `RECORD_AUDIO` muda as respostas |

**Sequência:** AND-4 antes de preencher Data Safety. AND-6 antes de gerar screenshots.

---

### 🟢 AND-8 — CI e OTA

**CI:** `.github/workflows/ios-tests.yml` tem nome legado mas conteúdo correto
(`name: Mobile Tests`, Jest em `mobile-app/`, sem EAS/credenciais). O P1.4 do checklist
está, na prática, resolvido. Trabalho restante: `git mv` para `mobile-tests.yml`. Minutos.

**OTA:** não existe hoje, **em nenhuma plataforma**. O manifest gerado traz
`expo.modules.updates.ENABLED = "false"` e `expo-updates` não está nas dependências. Os
`channel` declarados no `eas.json` (`development`/`preview`/`production`) não têm efeito
sem `expo-updates` — são placeholders. Portanto **"OTA channels EAS para Android" não é um
gap de Android**: é uma feature ausente do produto inteiro. Se entrar, é ciclo próprio
cross-platform, não parte da paridade.

---

## 4. Riscos, com evidência

Ordenados por probabilidade × impacto. "Evidência" = o que eu de fato rodei ou li;
"a validar" = o que só device físico resolve.

| # | Risco | Evidência | Como validar |
|---|---|---|---|
| ~~R1~~ | ~~Build Android falha por `expo-screen-orientation` SDK 55 em app SDK 54~~ **DESCARTADO** | `./gradlew assembleDebug` → BUILD SUCCESSFUL, APK gerado (§5.2) | — |
| R1' | Comportamento de orientação/fullscreen divergente **em runtime** por causa do mesmo mismatch | Compila, mas é módulo nativo de outra linha de SDK; `expo-doctor` acusa major mismatch | Device físico, junto de R2 |
| R2 | Auto-fullscreen ao girar não funciona no Android | `android:screenOrientation="portrait"` no manifest gerado × listener em `VideoPlayer.tsx:449-470` | Device físico: girar durante reprodução |
| R3 | Play Console barra/questiona `RECORD_AUDIO` + `SYSTEM_ALERT_WINDOW` | Manifest gerado lista ambas; `expo-av` usado só em 2 hooks de som | Revisão de política + teste de submissão em track interno |
| R4 | Legendas VTT do HLS R2 não aparecem ou aparecem diferente no ExoPlayer | Código sem branch de plataforma; engines diferentes (AVPlayer × ExoPlayer) | Device físico: aula com `subtitles_pt.vtt` |
| R3b | Efeitos sonoros do quiz mudos no Android | `useAudioOutput.ts` compara tipos de porta do AVAudioSession (iOS) e cai no fallback `false`; `useSound.ts:27` bloqueia som em `AUTO` sem fone | Device: acertar/errar questão sem fone conectado |
| R5 | **(confirmado)** Tab bar e menus do player sem blur no Android | `expo-blur`: `experimentalBlurMethod` tem `@default 'none'` e o código nunca passa a prop | Já confirmado no código; resta decidir blur experimental × fundo sólido |
| R6 | Layout invadido pelas barras de sistema (edge-to-edge) | `edgeToEdgeEnabled=true` no `gradle.properties`, nunca validado | Varredura de telas em device |
| R7 | Contraste quebrado com device em dark mode | Aviso do prebuild: `userInterfaceStyle` requer `expo-system-ui` (ausente) | Device em dark mode |
| R8 | Back do sistema descarta estado (quiz/fullscreen) | Zero `BackHandler` no código; `enableOnBackInvokedCallback=false` | Device: back durante quiz e em fullscreen |
| R9 | WebView dos DOM components com fundo branco / animação travada | `backgroundColor: 'transparent'` só no style; sem ajuste específico de Android | Device de gama média/baixa |
| R10 | `nativewind@5.0.0-preview.2` + `react-native-css@nightly` divergem no Android | Pins exatos confirmados no `package.json`; `npm test` verde; **nenhuma evidência de problema específico de Android** | Smoke visual amplo no primeiro preview |

**Sobre R10, honestamente:** o pedido listava as deps preview/nightly como risco. Não
encontrei nada que indique comportamento diferente no Android — NativeWind v5 compila
estilos no bundler, antes de qualquer plataforma. O pin exato está correto e `npm ci` é
determinístico. Trato como "vigiar no primeiro smoke", não como bloco de trabalho.

---

## 5. Verificações executadas nesta sessão

### 5.1 O gotcha do monorepo (EAS + pasta temp) — reavaliado

O pedido pedia para validar se ainda vale. **Não vale mais para este repo:**

```
$ git count-objects -vH   →  size-pack: 9.90 MiB
$ git ls-files | wc -l    →  898
$ git ls-files | xargs du -ch | tail -1  →  3.2M total
```

Distribuição: `frontend-web` 347, `backend-api` 272, `mobile-app` 176, `docs` 49. Nada
próximo do limite de upload do EAS. A anotação antiga (repo >10 GB, `.git` de 2,3 GB)
descrevia outro estado ou outra cópia em disco — não o repo canônico de hoje.

**Ressalva que substitui o gotcha:** o que importa agora não é tamanho, é **quais arquivos
sobem**. Como existe `.easignore`, ele substitui o `.gitignore` na hora do upload — e o
`.easignore` atual (`node_modules .expo dist android ios web-build coverage .idea .vscode *.log`)
**não** ignora `.env`, `google-services.json` nem `GoogleService-Info.plist`. É por isso
que os builds funcionam sem EAS secrets. Se alguém "consertar" o `.easignore` para ignorar
esses arquivos sem antes migrar para EAS secrets, **o build quebra** — inclusive o iOS.
Isso é o gotcha que merece ficar documentado no lugar do antigo.

### 5.2 Prebuild e compilação local do Android

```
$ npx expo prebuild --platform android --no-install --clean
✔ Finished prebuild
» android: userInterfaceStyle: Install expo-system-ui in your project to enable this feature.
```

O projeto nativo gerou sem erro de config plugin — nenhum plugin do `app.json` é
incompatível com Android. `google-services.json` foi copiado corretamente para
`android/app/`, e o plugin `com.google.gms:google-services:4.4.1` foi aplicado.

Em seguida compilei o APK debug localmente (JDK 17, Android SDK local, sem daemon):

```
$ cd android && ./gradlew assembleDebug --no-daemon
BUILD SUCCESSFUL in 33m
582 actionable tasks: 582 executed
→ android/app/build/outputs/apk/debug/app-debug.apk  (240 MB, debug/todas as ABIs)
```

**Este é o resultado mais importante do estudo: o Android compila hoje, do jeito que
está.** Zero erro de compilação, zero conflito de manifest, zero módulo nativo faltando —
com `newArchEnabled=true`, Hermes e as 40+ libs Expo do projeto. O único aviso foi
genérico do Gradle (*"Deprecated Gradle features … incompatible with Gradle 9.0"*), que
vem do template do Expo e não do app.

Consequência direta: **não existe bloqueador de build.** Todo o trabalho restante é de
runtime, de conformidade de loja e de acabamento — nada exige descobrir por que o Android
"não compila", porque ele compila.

**Oportunidade prática:** o APK ainda está em disco. Sendo um build **debug**, ele carrega
o bundle JS do Metro — não é um binário autônomo para entregar a alguém, mas **é
suficiente para começar o smoke Android hoje**, num device conectado ao Metro local
(`npx expo start --dev-client`), **sem depender de G1/G2**. Ou seja: R2 (rotação), R4
(legendas), R5 (blur), R6 (edge-to-edge), R7 (dark mode), R8 (botão voltar), R9 (WebView
do quiz) e R3b (som mudo) podem sair do estado "a validar" antes mesmo de o EAS estar
destravado. É o atalho mais barato que este estudo encontrou.

> **Limpeza:** `android/` é gitignored (`/android` no `mobile-app/.gitignore`) e foi gerado
> só para diagnóstico — **deixei em disco** justamente por causa do parágrafo acima; é só
> apagar a pasta quando não interessar mais (`npx expo prebuild` regenera). Nenhum arquivo
> versionado foi alterado por este estudo.

### 5.3 Comandos executados

```bash
npm test -- --runInBand              # 16 suites / 56 testes — verde
npx expo-doctor                      # 17/18 checks; falha em versões de deps
npx expo config --type introspect    # manifest/gradle.properties resultantes
npx expo prebuild --platform android --no-install --clean
cd android && ./gradlew assembleDebug --no-daemon
eas build:list --platform android    # negado: conta sem acesso ao projeto EAS
git count-objects -vH; git ls-files  # dimensionamento do repo
```

---

## 6. Pré-requisitos externos (dependem do Gustavo)

Nenhum destes foi criado, alterado ou solicitado nesta sessão — só mapeado.

| # | Item | Por que trava | Bloco |
|---|---|---|---|
| G1 | **Acesso EAS ao projeto** `c048ea29-...` para a conta que vai buildar (hoje `deixaapp` recebe `Entity not authorized`) | Sem isso não dá para inspecionar credenciais nem disparar build | AND-2 |
| G2 | **Keystore Android no EAS** — confirmar se já existe ou autorizar geração (`eas credentials -p android`) | Chave de assinatura define a identidade do app na Play para sempre | AND-2 |
| G3 | **Decisão sobre segredos de build**: manter `.env` local subindo via `.easignore` ou migrar para EAS env vars | Muda o `eas.json` e o procedimento de build | AND-2 |
| G4 | **Device Android físico para smoke** — de preferência dois: um recente e um de gama média (Android 12–14) | R2/R4/R5/R6/R7/R8/R9 só fecham em device real | AND-3, AND-5 |
| G5 | **Conta Google Play Console** (US$ 25, verificação de identidade pode levar dias) | Lead time externo; trava qualquer distribuição | AND-7 |
| G6 | **Service account do Play** exportado como `mobile-app/playstore-service-account.json` | `eas submit` já aponta para esse caminho | AND-7 |
| G7 | **Aprovação do rebranding** (quais das logos novas viram ícone/splash) | Define AND-6 e os screenshots de loja | AND-6 |
| G8 | **Decisão sobre política de orientação do app** (travar portrait e aceitar só o botão de fullscreen, ou liberar rotação) | É decisão de produto, não técnica | AND-3 |

---

## 7. Estimativa grosseira por bloco

Unidade: trabalho de agente. "Gate" = tempo humano/externo que não dá para comprimir.
Números para planejamento, não compromisso.

| Bloco | Trabalho | Gate humano | Observação |
|---|---|---|---|
| **AND-1** toolchain | 2–4 h | re-smoke iOS (~30 min) | Risco de regressão no iOS: alinhar `expo-screen-orientation` mexe no player já validado. Pode ser feito **junto** de AND-3, já que não bloqueia mais nada |
| **AND-2** credenciais/build | 1–2 h | G1–G3 + primeiro build EAS (~20 min de fila) | O trabalho é quase todo do Gustavo; o meu é ajustar `eas.json` e documentar |
| **AND-3** player/orientação | 4–8 h | G4 + G8 | A faixa é larga porque depende do que o smoke revelar sobre legendas no ExoPlayer |
| **AND-4** permissões/`expo-av`→`expo-audio` | 3–5 h | — | 2 hooks + testes já existentes; a saída rápida (`blockedPermissions`) é ~30 min |
| **AND-5** acabamento visual | 6–12 h | G4 (iterativo) | Bloco mais imprevisível: é varredura de telas, não uma correção pontual |
| **AND-6** assets/rebranding | 3–6 h | G7 | Cobre iOS junto; se o rebranding for só o ícone, fica na ponta baixa |
| **AND-7** Play Store | 2–4 h | G5, G6 (dias) | Só preparo; a submissão é do Gustavo |
| **AND-8** CI rename | 15 min | — | `git mv` |
| **(fora de paridade)** OTA/`expo-updates` | 4–8 h | — | Feature cross-platform ausente; não é dívida do Android |

**Caminho crítico até um APK preview instalável e testável:** só **AND-2** — e AND-2 é
quase inteiramente do Gustavo (G1/G2). Com acesso ao projeto EAS e keystore resolvidos, o
primeiro `eas build --profile preview --platform android` deve sair no mesmo dia, porque a
compilação já foi provada localmente. O grosso do esforço restante (AND-3/AND-5) só começa
**depois** desse primeiro smoke — é ele que converte "risco a validar" em "bug com repro".

---

## 8. Sequenciamento sugerido

```
Ciclo 1  AND-2                 → objetivo: APK preview instala e abre
         (bloqueado por G1,G2)   gate: login funciona, vídeo toca
                                 (compilação já provada localmente)

Ciclo 2  AND-1 + AND-3 + AND-4 → objetivo: player, orientação e permissões corretos
         (AND-1 junto de AND-3,  gate: smoke de aula completa em device
          mesmo módulo)

Ciclo 3  AND-5 + AND-6         → objetivo: parece um app Android, não um port
         (rebranding junto)      gate: screenshots aprováveis para loja

Ciclo 4  AND-7 (+ AND-8 junto) → objetivo: track interno no Play
         (bloqueado por G5,G6)
```

AND-8 pode entrar em qualquer commit de qualquer ciclo — não vale um ciclo próprio.

---

*Estudo read-only. Nenhum código de produção alterado; `mobile-app/android/` foi gerado
localmente para diagnóstico e é gitignored.*
