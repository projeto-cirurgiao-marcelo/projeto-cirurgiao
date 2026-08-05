# R9 — quiz travado no Android: causa raiz, fix e o que ficou aberto

> **Branch:** `fix/android-quiz-webview` (a partir de `c47580e`)
> **Data:** 2026-08-05
> **Bloco:** Ciclo 2, Bloco 1 — bloqueador de paridade Android

---

## 1. Causa raiz do travamento

**O único caminho de avanço do quiz passava por dentro da WebView.**

- `QuizPlayer.handleContinue` (`QuizPlayer.tsx:383`) guarda em
  `if (!quiz || selectedOption === null || !selectedConfidence) return;`
- `selectedConfidence` só era setado por `handleConfidenceTap`, chamado pela prop
  `onSelectConfidence` do **`GelpiCelebrateModalDOM`** — ou seja, de dentro da WebView.
- `onContinue` idem.
- Não havia timeout, botão nativo ou qualquer outra saída. Com a WebView muda, `playStep`
  ficava em `'awaitingConfidence'` **para sempre**.

Nada disso gera exceção: o app apenas espera um toque que nunca pode acontecer. Bate com
as evidências do smoke — nenhum `ReactNativeJS` de erro em 20.676 linhas de logcat — e com
`QuizAttempt`/`QuizAnswer` = 0 no banco, já que `handleSubmit` só é chamado por
`handleContinue`.

### Hipótese do adendo, corrigida

O adendo apontava o `onDone` (`setTimeout` de 1800 ms) do `GelpiFeedback`. **Esse
componente não participa do fluxo do QuizPlayer** — `grep` por `GelpiFeedback` fora do
próprio arquivo retorna vazio; ele está órfão no código. Por isso não existia timer algum
para salvar o avanço: o QuizPlayer usa o `GelpiCelebrateModal`, que não tinha nenhum.

---

## 2. ⚠️ Achado que reabre a investigação: é release-only

Ao validar o fix com um **build debug local** (`expo run:android`, sem EAS), o DOM
component **renderizou perfeitamente**: Dr. Gelpi, card de celebração, XP, opções de
confiança e botão "Continuar →" — e o fallback **não** disparou, como deve ser quando a
WebView responde.

| Build | DOM component | Quiz |
|---|---|---|
| **Preview/release (EAS `d132b5c1`)** | não pinta | trava na Q1 |
| **Debug local (`expo run:android`)** | renderiza normal | completa as 5 questões |

Ou seja: **não é "WebView quebrada no Android"** — é algo específico do build de release.
A diferença estrutural é a origem dos assets do DOM component:

- **debug:** servidos pelo **Metro**, via HTTP
- **release:** lidos do APK, em `file:///android_asset/www.bundle/…`

Duas hipóteses foram **descartadas** com evidência:

- *Assets não embarcados:* falso. O APK preview contém
  `assets/www.bundle/` com HTML shell (1.517 B), 3 CSS e `entry.js` de 545 KB.
- *Bloqueio de `file://`:* improvável. O bundle contém `allowFileAccessFromFileURLs`, ou
  seja, o expo-dom já configura o acesso.

**O que falta:** inspecionar o console da WebView num build **release** (`chrome://inspect`)
para ver se o `entry.js` lança erro ao rodar a partir de `file://`. Não foi possível neste
ciclo porque o build debug — o único que consigo gerar sem EAS — não reproduz a falha.

---

## 3. Fix aplicado (nível robustez)

Vale para todas as plataformas e independe da causa raiz do release:

- `GelpiCelebrateModalDOM` ganhou `onReady`, chamado no mount **dentro** da WebView. É o
  único sinal confiável de que a ponte DOM→nativo está viva.
- `GelpiCelebrateModal` (wrapper nativo) roda um timer de **2,5 s**. Sem handshake,
  renderiza um **fallback nativo** equivalente — título, subtítulo, XP, o
  `ConfidenceRating` que já existia e o botão Continuar — preservando inclusive a coleta de
  confiança, que é dado pedagógico.
- iOS inalterado: o handshake chega em ~200 ms e o fallback nunca aparece.

**Limitação declarada:** cobre WebView que **não monta**. WebView viva porém
**não-interativa** não é coberta — exigiria watchdog temporal, que dispararia falso
positivo com aluno pensando na resposta.

---

## 4. Evidências de validação

| O que | Resultado |
|---|---|
| Quiz completo de 5 questões (debug local) | ✅ Resultado 60%, 3/5 — `smoke/44-quiz-fim.png` |
| `QuizAttempt` no backend | ✅ 1 registro (score 60, passed false) + 5 `QuizAnswer` — contra **0/0** no smoke anterior |
| DOM component renderizando | ✅ `smoke/42-FIX-fallback.png` (Dr. Gelpi + card completo) |
| Caminho feliz sem regressão | ✅ fallback não dispara quando a WebView responde |
| `npm test` | ✅ 17 suites / 59 testes |
| Testes novos | 3 casos: WebView viva → sem fallback; muda → fallback; fallback coleta confiança e avança |

**O fallback não pôde ser exercitado em runtime**, porque o único build que reproduz a
falha é o release e o debug não a reproduz. Está coberto por teste unitário; a validação
end-to-end do fallback exige um build release novo (EAS — precisa de autorização — ou
`assembleRelease` local com keystore).

---

## 4-bis. Validação em build release (2026-08-05, build `2be96b44`)

### O modo de falha, caracterizado

Antes do build novo, ataquei o release-only no APK preview antigo (`d132b5c1`), que
reproduzia a falha. `uiautomator dump` mostrou que **a WebView não estava muda**:

```
android.webkit.WebView  bounds="[0,0][1080,2400]"     ← a view ocupa a tela inteira
text="Excelente, doutor!"        bounds="[0,0][0,0]"  ← mas o conteúdo tem 0x0
text="COMO VOCÊ SE SENTIU?"      bounds="[0,0][0,0]"
text="✓ Sabia"                   bounds="[0,0][0,0]"
text="Continuar →"               bounds="[0,0][0,0]"
```

O React montava, o conteúdo existia inteiro na árvore de acessibilidade, mas o **layout
colapsava para altura zero** — invisível e não-clicável. Daí o logcat silencioso: não havia
erro, só ausência de espaço. Mecanismo: quem dá altura é o `styles.css` do componente
(`min-height:100vh`), carregado por `<link>` de `file:///android_asset/www.bundle/`; o shell
inline do expo-dom só declara `#root { display:flex; flex:1 }`. No debug o CSS vem do Metro
por HTTP e aplica.

### O resultado do build novo — e o que ele NÃO permite concluir

| Build | Resultado |
|---|---|
| `d132b5c1` (04/08, sem o fix) | card invisível, bounds 0x0, quiz travado |
| `2be96b44` (05/08, branch com fix v1) | **card renderiza normal, quiz completa 5/5** |

No build da branch o quiz foi até o fim: resultado 40% (2/5), com `QuizAttempt` = 1 e
`QuizAnswer` = 5 confirmados no banco. O fallback **não** apareceu — corretamente, já que a
WebView estava funcional.

**Honestidade sobre a atribuição:** não é possível creditar essa melhora ao fix v1. O v1
adicionou apenas o handshake `onReady` — que **não toca em layout**. A explicação mais
provável é que a falha original **não era determinística**, ou dependia de algo do ambiente
do build de 04/08 (resolução de dependências, cache de assets do EAS). Ou seja:

- ✅ O bloqueador **não se manifesta** no build atual da branch.
- ❌ Não está provado que o fix o corrigiu, nem que a falha não volta.
- ❌ O fallback continua **sem validação em runtime**, porque não houve falha para acioná-lo.

### Consequência para o fix

O v1 dependia de `onReady` **não chegar**. Como o React monta mesmo no caso colapsado, o
handshake chegaria e o fallback nunca dispararia — ou seja, **o v1 não teria coberto o modo
de falha real**. Corrigido no commit seguinte:

- **Raiz:** altura por estilo **inline** no elemento raiz do DOM component
  (`position:fixed; inset:0; min-height:100vh`), sem depender de CSS externo via `file://`.
- **Robustez:** `onReady` passa a reportar a **altura medida** (após `requestAnimationFrame`);
  o nativo só confia na WebView se ela ocupa ≥ 80px.

Essa versão (v2) está na branch e passa nos testes, mas **não foi exercitada em release** —
o build testado é o da v1, e a falha não reproduz mais para exercitar o fallback.

---

## 5. Recomendação de sequência

1. **Mergear este PR.** O fallback remove o bloqueador independentemente da causa raiz:
   mesmo que a WebView continue muda no release, o aluno completa o quiz.
2. **Build release + smoke** para (a) confirmar que o fallback aparece de fato e (b)
   inspecionar o console da WebView e fechar a causa raiz do release-only.
3. Se a causa raiz for de compatibilidade profunda do WebView Android com assets `file://`,
   avaliar degradar graciosamente (pular a animação no Android) e registrar como item de
   acabamento no AND-5 — conforme o prompt do bloco.

---

## 6. Notas de execução

- Nenhum `eas build` foi disparado. O build local usou `expo run:android`.
- O `.env` do `mobile-app` aponta a API para `192.168.0.13:3000` (backend local, fora do
  ar), o que fazia o login falhar com `AxiosError: Network Error`. Contornado rodando o
  Metro com `EXPO_PUBLIC_API_URL` de produção **via ambiente**, sem alterar o arquivo.
- O emulador ficou sem espaço com os dois APKs; o preview foi desinstalado para instalar o
  debug. O `.apk` do preview está preservado no scratchpad.
- Dados de teste em produção foram removidos ao final (transação; `QuizAttempt`,
  `QuizAnswer`, `Quiz`, `QuizQuestion`, `XpLog`, `GamificationEvent`, `UserStreak`), com as
  2 matrículas pré-existentes preservadas.

---

## 7. Tentativa de validação com colapso induzido (2026-08-05, encerrada por time-box)

Para exercitar o fallback em runtime — a lacuna que restou —, o colapso foi **induzido**:
edição temporária, não-commitada, neutralizando o `min-height` do `styles.css` e o estilo
inline da v2, reproduzindo o estado "monta colapsada".

**Não foi possível concluir. Ambos os caminhos falharam por ambiente, não por código:**

1. **Debug + Metro:** o app ficou preso em `Loading from 10.0.2.2:8081` indefinidamente.
   Diagnóstico: Metro vivo escutando em `0.0.0.0:8081` com bundle quente (247 ms),
   `adb reverse tcp:8081 tcp:8081` ativo, `ping 10.0.2.2` respondendo em 12 ms, e troca do
   bundle location para `localhost:8081` pelo dev menu sem efeito. O mesmo fluxo funcionara
   duas vezes mais cedo no mesmo dia — instabilidade do host após reinícios do Metro.
2. **Release local (`assembleRelease`):** falha dura do **Windows MAX_PATH**:

```
ninja: error: Stat(...react-native-safe-area-context/.../safeareacontextJSI-generated.cpp.o):
Filename longer than 260 characters
```

O build **debug** passa porque `buildCMakeDebug` gera caminhos mais curtos que
`buildCMakeRelWithDebInfo`. Resolver exigiria habilitar long paths no registro do Windows
ou mover o repositório para um caminho raso — mudanças no ambiente do desenvolvedor, fora
do escopo do bloco. (Falha secundária: plugin do Sentry pedindo `--org` para upload de
source maps, que no EAS é neutralizado por `SENTRY_DISABLE_AUTO_UPLOAD=true`.)

**Consequência aceita:** o fallback permanece coberto por **teste unitário** (4 casos,
incluindo o que reproduz "monta colapsada em 0px"), e a validação em campo fica para o
próximo build EAS natural do Ciclo 2. O risco dessa escolha é limitado: se o fallback
falhar, o comportamento volta a ser o atual — o quiz travado —, não um estado pior.

**Bug encontrado na preparação deste teste (e corrigido):** a medida de altura usava
`Math.max(altura do #root, documentElement.clientHeight)`. No modo de falha a WebView ocupa
a tela inteira enquanto o conteúdo colapsa — o `clientHeight` voltaria ~2400 e mascararia
exatamente o caso a detectar. Corrigido para medir só o `#root` (commit `6c2b1b8`). Sem
isso, o fallback não dispararia nem com a v2.
