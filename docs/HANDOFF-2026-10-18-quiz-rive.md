# Handoff — Quiz da aula em Rive (mobile)

**Data:** 18/10/2026 · **PR:** #71 (`82b5b95..543d62e`, autoria xoiurp) · **Estado:** mergeado na `main`, ligado só em `preview`.

## O que mudou pro aluno
Hoje **nada**. Tudo fica atrás do toggle `EXPO_PUBLIC_QUIZ_RIVE=1`, ligado só no profile `preview` do `mobile-app/eas.json`. O profile `production` continua com o quiz antigo (QuestionCard + GelpiCelebrateModal em WebView). Builds preview testados pelo Gustavo (Android `f1353712`, iOS `fa18cf44`, 1.0.0 build 7): OK no Android e no iPhone 8, inclusive com VoiceOver.

## Arquitetura
- `src/components/quiz/QuizPlayer.tsx` continua dono da lógica: `checkAnswer`, `submit`, XP, combo, haptics e som. Monta um `QuizViewModel` e, em `riveMode`, renderiza `QuizRiveView` no lugar da UI antiga.
- `src/components/quiz/rive/quiz-view-model.ts` é o contrato. `toQuizViewModel()` converte o estado que o QuizPlayer já guarda (sem estado novo); `QUIZ_TRIGGERS` lista os toques que o Rive devolve. Teste: `__tests__/components/quiz/quiz-view-model.test.ts`. Durante o quiz o gabarito não vem do servidor: só a alternativa escolhida vira certa/errada; a correta aparece na revisão do resultado.
- `src/components/quiz/rive/QuizRiveView.tsx` só desenha e devolve toques. Exporta `QUIZ_RIVE_ENABLED`.
- Android com leitor de tela ligado: `riveMode` fica falso e entra a UI antiga (o runtime do Rive só expõe acessibilidade no iOS).
- Deps nativas com versão fixa: `@rive-app/react-native@0.5.5`, `react-native-nitro-modules@0.35.10`. Qualquer mudança exige build EAS novo, não sai por OTA. `metro.config.js` ganhou `assetExts.push('riv')`.

## A cena Rive
- O app carrega `mobile-app/assets/rive/quiz.riv` (907 KB, quase tudo a fonte Inter variável).
- Fonte em `mobile-app/rive/quiz/`. `scene.rml` é **gerado** por `gen-scene.mjs` (inclui o conversor do Dr. Gelpi a partir de `gelpi.svg`, extraído do antigo `DrGelpiSVG.tsx`). Nomes de view models, propriedades e enums do gerador batem com o contrato: mudou um lado, muda o outro.
- Pra mexer na cena, com o Rive CLI 1.6.0 (Windows: `irm https://releases.rive.app/cli/install.ps1 | iex`):
  1. `node mobile-app/rive/quiz/gen-scene.mjs`
  2. `rive mobile-app/rive/quiz --verify` **e** `rive inspect mobile-app/rive/quiz --summary` (verificam coisas diferentes).
  3. Capturas: `rive mobile-app/rive/quiz --screenshot=x.png --advance=40 --data=phase=feedback "--data=options[0]/state=correct"`
  4. `rive mobile-app/rive/quiz --once` e copiar `build/quiz.riv` pra `mobile-app/assets/rive/`.
- Sem scripts Luau: não precisa de `rive login` nem assinatura.
- `mobile-app/rive/` está no `.easignore` (o app só usa o `.riv`).

## Pegadinhas já descobertas
- Mudar uma **lista** de um view model já ligado ao `RiveView` não redesenha no Android. Listas (alternativas, revisão) são preenchidas antes e o `RiveView` remonta (`key`) quando o conteúdo muda. Texto, números e enums atualizam ao vivo.
- **Fast Refresh** fecha as instâncias nativas (`RiveResourceClosedException`). Testar sempre com reinício a frio.
- Keyframe de `x`/`y` **substitui** a posição em vez de somar: cada grupo do Gelpi tem um Node de fora que posiciona e um de dentro que anima.
- `position: absolute` com left/right não esticou; a raiz da cena usa layout `stack`.
- Windows: o CLI estraga acentos em `--data` e `--semantic-action` não funciona (problemas do CLI).
- Build Android local com `subst X:`: o autolinking grava caminhos `C:` e o codegen do Nitro quebra ("different roots"). Reescrever `android/build/generated/autolinking/autolinking.json` trocando o caminho do repo por `X:` e recompilar.
- Metro com o quiz novo: `EXPO_PUBLIC_QUIZ_RIVE=1` e `EXPO_PUBLIC_API_URL` de produção no ambiente antes de `npx expo start --dev-client`.

## Removido
`GelpiFeedback.tsx`, `juice/dom/DrGelpiDOM.tsx`, `GlowPulse.tsx` (já não importados) e o spike/banco de provas (`app/rive-spike.tsx`, `rive/quiz-spike/`). **O quiz antigo foi mantido de propósito**: roda em produção e no Android com TalkBack.

## Pendências (decisões do Gustavo)
1. **Camada TalkBack:** branch local `feat/quiz-rive-talkback`, commit `472c996`, sem push. Adiciona `QuizA11yLayer` e tira o fallback pra UI antiga. Criada antes do merge: **precisa de rebase na main** antes do PR. Falta teste manual com TalkBack.
2. **Ligar em produção:** `EXPO_PUBLIC_QUIZ_RIVE=1` no profile `production` + build nas lojas. Sugestão: não misturar com o build do IAP iOS (uma variável por revisão da Apple).
3. **Reduzir o `.riv`** com subset da fonte Inter.
4. **Medir desempenho** num build de release Android.
5. Só depois de 1 e 2: apagar a UI antiga (QuestionCard, QuizResult, GelpiCelebrateModal + `juice/dom`, ComboMeter, XpBurst, ScreenShake).

Obs.: durante o teste, um quiz foi gerado na aula "Apresentação da plataforma Projeto Cirurgião" e uma tentativa registrada na conta do Gustavo, com autorização dele.

## Adendo 19/10/2026 — toque no iOS (PR #73)

**Sintoma:** no iPhone 8, build preview, os botões da folha de feedback (Chutei…) não respondiam; depois, com a folha sempre presente na cena, nada respondia após alguns toques, e qualquer remontagem do RiveView "resetava" por mais alguns toques. Android e o Rive CLI (`--pointer=click@x,y --data-dump`) disparavam tudo.

**Causa (apurada com build de sonda, cenas V0–V4 e dois backends):** no backend iOS **novo** do `@rive-app/react-native` (padrão, baseado no command server do rive-ios 6.28), as assinaturas dos triggers do view model deixam de entregar ao app depois de alguns eventos; não é a cena (V0–V3 iguais), nem state machine assentada (V4 com camada em loop não mudou). No backend **legado** todos os triggers chegam, mas ele para o render quando a state machine assenta e uma escrita de dados do app não o acorda (rive-ios #383): a alternativa só pintava no toque seguinte.

**Fix:** (1) `USE_RIVE_LEGACY=1` no `env` de todos os profiles do `eas.json` (o podspec lê no `pod install`; Android ignora); (2) camada `Pump` sempre em loop no `gen-scene.mjs` (nó invisível, 60 frames), que mantém o render vivo no legado; (3) folha/backdrop/resultado nunca `display:none`, saem por y/opacidade; (4) listeners dos triggers da raiz reassinados a cada montagem. Validado no iPhone 8 em 19/10: quiz inteiro, inclusive reabrir.

**Consequências:** o backend legado **não tem semantics** (VoiceOver); `QuizPlayer` já cai na UI antiga com leitor de tela em qualquer plataforma. A camada TalkBack/VoiceOver pendente passa a valer para os dois sistemas. Build local (`npx expo run:ios`) precisa de `USE_RIVE_LEGACY=1` no ambiente do `pod install`. Reavaliar o backend novo quando o pacote/rive-ios corrigir a entrega dos triggers (acompanhar issues do rive-nitro-react-native).
