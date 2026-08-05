# Ciclo 2, Bloco 2 — player Android (R2b + R4) + toolchain (AND-1)

> **Branch:** `fix/android-player-fullscreen-captions` (a partir de `af74fd9`)
> **Data:** 2026-08-05
> **Build de validação:** EAS preview `cd3127c9` (Android, da própria branch)

---

## Veredicto por item

| Item | Veredicto | Evidência |
|---|---|---|
| **R2b** — preso no fullscreen ao voltar para portrait | ✅ **corrigido, validado em release** | `smoke/R2b-CORRIGIDO-sai-fullscreen.png` |
| **R4** — legenda colidindo com os controles | ✅ **corrigido, validado em release** | `smoke/R4-CORRIGIDO-sem-colisao.png` |
| **AND-1** — 4 deps alinhadas ao SDK 54 | ✅ **sem regressão** — auto-fullscreen por rotação segue funcionando | `smoke/104-R2b-10s.png` |
| **v2 do quiz em campo** | ✅ **caminho feliz em release** — card renderiza, fallback não dispara | `smoke/108-v2-quiz-release.png` |

---

## R2b — o mecanismo real

A hipótese do prompt (eventos de orientação não chegando ao JS) estava certa na
consequência; o mecanismo exato é:

- `enterFullscreen()` no Android **abre uma Activity separada** (`FullscreenPlayerActivity`).
- Com ela em primeiro plano, a MainActivity não recebe mudança de configuração — o
  `ScreenOrientation.addOrientationChangeListener` (`VideoPlayer.tsx:449-470`) nunca
  dispara e `exitFullscreen()` não é chamado.
- **Não** é `onFullscreenEnter` que falha: ele é emitido normalmente no Android
  (`VideoView.kt:217`).

**Correção pelo nativo, sem código novo:** o expo-video já implementa auto-exit por
rotação dentro da própria Activity de fullscreen — `FullscreenOptions.autoExitOnRotate`,
disponível em Android **e** iOS, apenas **desligado por padrão** e nunca setado pelo app.

```tsx
fullscreenOptions={{ enable: true, orientation: 'landscape', autoExitOnRotate: true }}
```

⚠️ **Pegadinha documentada no próprio pacote:** `autoExitOnRotate` **não tem efeito** com
`orientation: 'default'`. Os dois andam juntos — sem isso a correção falharia em silêncio.

O ramo de exit em JS foi mantido como rede de segurança para quando a janela nativa não
estiver ativa.

---

## R4 — por que mover a barra, e não a legenda

A legenda é desenhada pelo player **nativo** no rodapé da view de vídeo. Não é view RN e o
expo-video **não expõe** prop de posicionamento (as públicas são `contentFit`,
`contentPosition`, `surfaceType`, `showsTimecodes`…). Como a legenda não pode ser movida,
quem sai da frente é a barra: `bottom` de 10 → 72 quando há faixa ativa, o que acomoda duas
linhas com respiro. Sem efeito no fullscreen (lá o overlay RN nem é montado) e sem mudança
com a legenda desligada.

---

## AND-1 — o que mudou e o que ficou de fora

```
expo-screen-orientation        55.0.13 → ~9.0.9    (major: era linha do SDK 55)
@react-native-community/slider 5.2.0   → 5.0.1
expo-glass-effect              0.1.9   → ~0.1.10
expo-linking                   8.0.11  → ~8.0.12
```

Ranges fixados no formato do Expo (não o caret que o `npm install` aplicou), para não
flutuar. A regressão que o prompt temia **não ocorreu**: o auto-fullscreen por rotação
continua funcionando com a `expo-screen-orientation` alinhada.

**Fora de escopo por decisão:** `expo-router 6.0.23 → ~6.0.24` passou a aparecer no
`expo-doctor` (só é visível rodando online). Não estava nos 4 alvos e é o roteador do app
inteiro — merece smoke próprio.

---

## 🔴 Gate para o próximo build iOS

O AND-1 e o `fullscreenOptions` **só afetam o iOS no próximo build iOS** — nada muda no
TestFlight atual. Quando esse build sair:

> **Exige re-smoke do player no iOS: entrar e sair de fullscreen, rotação e legendas.**

Dois motivos: (a) `expo-screen-orientation` mudou de major e é o módulo do fullscreen;
(b) `autoExitOnRotate` + `orientation: 'landscape'` valem para iOS também, alterando o
comportamento de rotação em fullscreen.

---

## Nota de método: como simular rotação no emulador

`adb emu rotate` gira o **display**, mas não alimenta o acelerômetro — e o
`autoExitOnRotate` observa o **sensor**. Com a Activity de fullscreen travada em landscape,
girar o display não a faz sair, o que dá falso negativo. O que funciona:

```bash
adb shell settings put system accelerometer_rotation 1   # auto-rotate LIGADO (obrigatório:
                                                          # a doc diz que sem isso não auto-sai)
adb emu sensor set acceleration 0:9.81:0                  # portrait
adb emu sensor set acceleration 9.81:0:0                  # landscape
```

---

## Limitações desta validação

- **Iteração em debug foi impossível:** o emulador ficou com 93% de `/data` e o app não
  montava (`DeviceStorageMonitorService: Failed to free 622811544 on storage`). O smoke foi
  feito direto no APK de release do EAS. Para instalá-lo foi preciso desinstalar o
  `app.rork.service_marketplace_app_*` (autorizado pelo Gustavo).
- **R3b (som do quiz) segue sem validação** — o áudio do emulador continua quebrado
  (`pcm_writei failed`). Só device físico resolve.
- **O fallback do quiz continua sem ser exercitado em runtime**: a WebView funcionou em
  release, então o caminho de fallback não foi acionado. O que se validou aqui é o
  **caminho feliz da v2 em release** — que nenhum build anterior tinha coberto.

---

## Cleanup

Dados de teste em produção removidos em transação (`QuizAttempt` 1, `QuizAnswer` 5, `Quiz`
1 + 5 `QuizQuestion`, `XpLog` 2, `GamificationEvent` 3, `UserBadge` 1, `UserStreak` 1,
`Progress` 1); tudo em zero na verificação, **2 matrículas pré-existentes preservadas**.
APK de teste desinstalado, pasta `android/` removida, proxy encerrado.
