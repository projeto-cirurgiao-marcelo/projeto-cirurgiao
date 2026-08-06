# Ciclo 2, Bloco 4 — AND-4: permissões do Play + migração expo-av → expo-audio

> **Branch:** `fix/android-audio-permissions` (a partir da `main` pós-merge de #61 e #62)
> **Build de validação:** EAS preview `3918766b` (Android, da própria branch)

---

## 1. Manifest antes → depois (insumo do Data Safety, AND-7)

Medido no **APK de release do EAS** com `aapt2 dump permissions` — não no manifest de
origem, que engana (ver §3).

| Permissão | Antes | Depois |
|---|---|---|
| `RECORD_AUDIO` | presente | **removida** |
| `MODIFY_AUDIO_SETTINGS` | presente | **removida** |
| `READ_EXTERNAL_STORAGE` | presente | **removida** |
| `WRITE_EXTERNAL_STORAGE` | presente | **removida** |
| `SYSTEM_ALERT_WINDOW` | presente | **removida** |

**Permissões que restam no APK — todas justificáveis:**

```
INTERNET                          rede
VIBRATE                           haptics
ACCESS_NETWORK_STATE              @react-native-community/netinfo
ACCESS_WIFI_STATE                 idem
USE_BIOMETRIC / USE_FINGERPRINT   expo-secure-store (P0.6)
FOREGROUND_SERVICE                expo-video
FOREGROUND_SERVICE_MEDIA_PLAYBACK expo-video (playback em background)
```

Nenhuma delas é "perigosa" no sentido do Play (não há runtime permission de microfone,
câmera, localização, contatos ou armazenamento). O questionário de Data Safety pode ser
respondido sem declarar captura de áudio.

---

## 2. 🔴 R3b reclassificado: não é bug de Android

O estudo registrou "som do quiz mudo no Android" como bug de plataforma. **Não é.**

```js
// src/hooks/useSound.ts
const SOURCES: Partial<Record<SoundKey, number>> = {
  // correct: require('../assets/sounds/correct.mp3'),   ← tudo comentado
  ...
};
```

`src/assets/sounds/` **não existe** e não há um único arquivo de áudio no projeto
(`find … -iname "*.mp3" -o -iname "*.wav"` → vazio). O hook é **no-op por design**, com o
comentário "Manter undefined até arquivos chegarem (Sprint asset)".

Ou seja: **o som nunca tocou em nenhuma plataforma.** O bug de detecção de fone era real,
mas invisível — silenciava algo que já não existia.

**Veredicto:** R3b sai da lista de bugs de paridade Android e vira **item de conteúdo** —
alguém precisa fornecer os 6 arquivos de som (`correct`, `wrong`, `combo`, `levelup`,
`badge`, `streak`). Enquanto isso, a validação "som audível sem fone" é vazia.

---

## 3. Duas armadilhas que só o manifest mesclado revelou

**A migração sozinha não limpa as permissões.** O `expo-audio` **também** declara
`RECORD_AUDIO` e `MODIFY_AUDIO_SETTINGS` — ele traz `AudioRecorder`. Trocar `expo-av` por
`expo-audio` removeu as permissões do manifest de *origem*, mas elas **voltaram** no
manifest mesclado. Resolvido com `android.blockedPermissions` no `app.json`.

**`SYSTEM_ALERT_WINDOW` nunca esteve no release.** Ela vem de
`android/app/src/debug/AndroidManifest.xml` — o manifest de **debug** do template do React
Native, usado pelo dev overlay. O baseline do estudo mediu o manifest de origem/debug e a
contabilizou indevidamente.

**Lição de método:** para permissões, o que vale é `aapt2 dump permissions <apk-release>`
ou o manifest em `merged_manifest/release/`. O manifest de origem (pós-`prebuild`) e o de
debug **mentem** — um por não aplicar `tools:node="remove"`, o outro por incluir
permissões que só existem em debug.

---

## 4. Semântica de `AUTO` redefinida (decisão registrada)

`useAudioOutput.ts` foi **removido**. Ele comparava nomes de porta do **AVAudioSession**
(`BluetoothA2DP`, `WiredHeadphones`, `LineOut`…) — no Android caía sempre no fallback
`false`, e com a preferência padrão `AUTO` silenciava tudo.

O `expo-audio` **não expõe rota/porta de saída** — a API de dispositivos cobre apenas
*inputs* de gravação. Não há como reimplementar "só toca com fone" de forma
multiplataforma.

**Decisão:** `AUTO` passa a significar **"toca, respeitando volume e silencioso do
sistema"** — o controle que o usuário já tem no aparelho. Quem não quiser som usa `NEVER`.
Guardado por teste (`useSound.test.ts`).

> ⚠️ Isto **muda o comportamento no iOS**, onde a detecção funcionava: com `AUTO` e sem
> fone, antes não tocava; agora tocaria. Como não há assets de som, o efeito prático hoje é
> zero — mas a decisão precisa ser confirmada quando os sons chegarem.

---

## 5. 🔴 Gate acumulado para o próximo build iOS

Somam-se agora **três** motivos para re-smoke do iOS no próximo build:

1. **AND-1** — `expo-screen-orientation` mudou de major (módulo do fullscreen).
2. **Bloco 2** — `fullscreenOptions` (`autoExitOnRotate` + `orientation`) vale para iOS.
3. **AND-4 (este)** — `expo-av` → `expo-audio` e a nova semântica de `AUTO`.

> **Próximo build iOS exige: player (fullscreen/rotação/legendas) + verificação de que
> nada depende do `expo-av` removido.**

---

## 6. Evidências do smoke em release (`3918766b`)

| O que | Resultado |
|---|---|
| Permissões no APK | ✅ apenas as 8 legítimas (`aapt2 dump permissions`) |
| **R7** — status bar em dark mode | ✅ ícones escuros e legíveis (login, home, quiz) |
| **v2 do quiz** — 3º passe em release | ✅ card renderiza, fallback não dispara |
| Quiz completo | ✅ 40% (2/5), `QuizAttempt` 1 + `QuizAnswer` 5 no backend |
| `npm test` | ✅ 17 suites / 61 testes |

---

## 7. Saneamento do ambiente (Parte B do prompt)

- **AVD**: `/data` de 6 GB → **20 GB** (19 GB livres, contra 431 MB), RAM 2 → 4 GB. Feito
  aumentando a partição + `-wipe-data`, em vez de recriar o AVD — mesmo efeito, preserva o
  device profile.
- **Áudio do emulador**: **zero** erros `pcm_writei`. R3b seria mensurável — se houvesse
  sons.
- **Long paths**: `LongPathsEnabled` **já estava 1** no registro; por isso o `ninja` falhava
  mesmo assim (CMake não usa a API que respeita a flag). `git config --global
  core.longpaths true` aplicado.
- **Prova de saneamento** ✅: `expo run:android` conecta no Metro e o app monta. O bloqueio
  que travou três blocos era **espaço em disco**, não rede.

---

## 8. Cleanup

Dados de teste removidos em transação (`QuizAttempt` 1, `QuizAnswer` 5, `Quiz` 1 + 5
`QuizQuestion`, `XpLog` 1, `GamificationEvent` 1, `UserStreak` 1); tudo em zero na
verificação, **2 matrículas pré-existentes preservadas**. Dark mode do emulador restaurado
para off, pasta `android/` removida, proxy encerrado.
