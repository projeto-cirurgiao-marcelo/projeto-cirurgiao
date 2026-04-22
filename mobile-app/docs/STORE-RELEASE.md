# Store Release — Checklist pra Submissao

Checklist operacional pra Gustav submeter o **Projeto Cirurgiao** pra TestFlight
(iOS) e Google Play Internal (Android). **Eu (teammate B) nao gero screenshots
nem escrevo descricao de loja — voce executa essa parte; meu papel e o
checklist + templates.**

Bundle: `com.projetocirurgiao.app` (iOS + Android)
Nome publico: Projeto Cirurgiao
Versao target: 1.0.0 (golive)

---

## 1. Ativos visuais exigidos

### Icone do app

- [x] `mobile-app/assets/icon.png` — icone base (1024x1024 recomendado pra
      App Store, escalado automaticamente).
- [x] `mobile-app/assets/adaptive-icon.png` — Android adaptive (foreground
      layer, 432x432 safe zone dentro de 1024x1024).
- [ ] **Confirmar resolucao real:** Gustav, roda `file mobile-app/assets/icon.png`
      pra confirmar 1024x1024. Se menor, regenera. Apple rejeita icone menor
      que 1024x1024 no submit.

### Splash / Launch screen

- [x] `mobile-app/assets/splash-icon.png` — imagem central, background
      `#FFFFFF`.
- [ ] Confirmar: logo centralizado, sem texto (Apple desaprova texto em
      splash), resolucao 200x200 minima + area transparente em volta.

### Screenshots — **A GERAR** (Gustav tira em device real ou simulator)

Apple e Google exigem resolucoes especificas. Minimo 3 screenshots por
resolucao.

**iPhone (obrigatorio):**
- [ ] **6.9" display** (iPhone 16 Pro Max): 1290 x 2796 px
- [ ] **6.5" display** (iPhone 11 Pro Max / 14 Plus): 1242 x 2688 px

**iPad:** n/a — `supportsTablet: false` no sprint (ver TECH-DEBT).

**Android (obrigatorio):**
- [ ] **Phone portrait**: 1080x1920 mais amplo aceito. Minimo 2, maximo 8.
- [ ] **Feature graphic**: 1024x500 (obrigatorio Google Play).
- [ ] **Tablet 7"/10"**: opcional. Pode pular se nao tiver layout pra tablet.
- [ ] **Fold**: opcional. Pode pular.

**Sugestao de 5 screenshots** que mostram valor:
1. **Home** com cursos em andamento + catalogo (mostra hierarquia de conteudo).
2. **Watch** com video tocando + tabs Resumo/Materiais/Notas/Quiz visiveis
   (mostra IA integrada).
3. **Gamificacao** com badges/XP/streaks (mostra retention).
4. **Chat AI** conversando sobre um video (mostra diferencial RAG).
5. **Forum** com discussao medica ativa (mostra comunidade).

**Dica:** tira screenshots com **StatusBar cheia** (horario, bateria, sinal),
nao da vazia. Apple gosta.

---

## 2. Metadata de loja

### Nome publico
- iOS App Store: **Projeto Cirurgiao** (max 30 chars — cabe).
- Google Play: **Projeto Cirurgiao** (max 30 chars — cabe).

### Subtitle (iOS only)
- Max 30 chars. Sugestao: **Educacao em cirurgia vet com IA**.

### Short description (Google Play only)
- Max 80 chars. Sugestao:
  > Aprenda cirurgia veterinaria com videos, IA e uma comunidade de alunos.

### Long description (ambos)

Template em pt-BR abaixo. Max 4000 chars (Apple) / 4000 chars (Google).
Enxuto pra caber nos 2.

```
Projeto Cirurgiao — a plataforma de educacao em cirurgia veterinaria que
acompanha voce da graduacao a residencia.

O QUE VOCE ENCONTRA:

- Mais de 150 videos de cirurgias reais, gravados em alta resolucao e
  com legendas em portugues.
- Resumos automaticos gerados por IA, pra voce revisar rapido antes de uma
  prova.
- Quizzes adaptativos ao final de cada aula, com feedback detalhado.
- Chatbot especializado que responde duvidas sobre o video que voce esta
  assistindo (RAG sobre transcricoes).
- Biblioteca de livros veterinarios consultavel via IA (RAG sobre livros).
- Forum ativo pra trocar casos clinicos com colegas e instrutores.
- Gamificacao: XP, niveis, streaks diarios, badges e ranking semanal pra
  manter voce engajado.

PRIVACIDADE & SEGURANCA:

- Autenticacao via email/senha ou conta Google (Firebase Auth).
- Dados salvos em servidores no Brasil (Google Cloud — southamerica-east1).
- Politica de privacidade em https://projetocirurgiao.app/privacy

Feito por veterinarios, pra veterinarios.

Duvidas ou feedback: contato@projetocirurgiao.app
```

### Keywords (iOS — 100 chars separados por virgula)
- Sugestao: `cirurgia,veterinaria,vet,medicina veterinaria,aulas,curso,educacao,animais,pet,anatomia`
- Contar caracteres antes de submeter (regex `.length` ou site como
  appfollow.io/keyword-calculator).

### Categorias
- **iOS primary:** Education
- **iOS secondary:** Medical
- **Google Play category:** Education
- **Google Play tags:** Education, Medical reference

### Classificacao etaria
- **Apple:** `4+` (sem conteudo sensivel no app, mesmo mostrando cirurgias
  — Apple considera educacional). Se Apple rejeitar no review por conteudo
  grafico, subir pra `12+`.
- **Google Play:** preenche o questionario IARC. Respostas:
  - Violencia: Nenhuma.
  - Sangue / feridas / procedimentos medicos: **Sim** (cirurgias reais em
    animais). Google classifica isso como `Teen 12+` provavelmente.
  - Sexualidade: Nenhuma.
  - Profanidade: Nenhuma.
  - Drogas: Nenhuma.
  - Apostas: Nenhuma.

### Contato de suporte
- Email: **contato@projetocirurgiao.app** (Gustav confirma).
- Telefone: opcional.
- Site de marketing: **https://projetocirurgiao.app**.

---

## 3. Politica de privacidade

**OBRIGATORIO** pra ambas as lojas.

- [ ] Publicar em **https://projetocirurgiao.app/privacy** (pagina publica, sem
      autenticacao).
- [ ] Cobrir:
  - Quais dados pessoais sao coletados (nome, email, foto de perfil, progresso
    de aprendizado, conversas com chatbot).
  - Base legal LGPD (execucao de contrato + legitimo interesse).
  - Retencao (durante vigencia da conta + 90 dias pos-cancelamento).
  - Compartilhamento com terceiros: Firebase (auth), Google Cloud (hosting),
    Vertex AI (processamento de texto pro chatbot).
  - Direitos do titular (acesso, correcao, exclusao, portabilidade).
  - Contato do DPO ou responsavel: Gustav.
  - Data da ultima atualizacao.

### App Privacy (iOS "Nutrition Label")

Preenche no App Store Connect o que o app coleta. Nossa lista:
- **Contact Info:** Email, Nome.
- **User Content:** Notas de estudo, mensagens de chat, posts no forum.
- **Identifiers:** User ID (Firebase UID).
- **Usage Data:** Product Interaction (progresso em videos, tempo assistido).
- **Diagnostics:** Crash data (quando Sentry for plugado — hoje nao coleta).

Marcar cada um como "Linked to user" e "Not used for tracking".

### Data Safety (Google Play)

Mesmo preenchimento no Play Console. **Obrigatorio desde 2022.** Se nao
preencher, submit bloqueado.

---

## 4. Release notes — template

Primeira publicacao (v1.0.0):

```
Versao 1.0 — Lancamento inicial

- Catalogo completo de cirurgias veterinarias em video.
- Assistente de IA que responde duvidas sobre o video que voce esta vendo.
- Resumos, quizzes e notas gerados automaticamente.
- Biblioteca de livros veterinarios consultavel.
- Forum de discussao entre alunos e instrutores.
- Sistema de conquistas pra manter voce estudando.
- Suporte offline: banner avisa e voce retoma onde parou quando voltar a conectar.

Feedback? contato@projetocirurgiao.app
```

Max 4000 chars (Apple) / 500 chars (Google Play notes). Template acima cabe
nos 2 com folga.

---

## 5. Submissao — passo a passo

### iOS (TestFlight -> App Store)

1. `eas build --profile production --platform ios` — gera `.ipa`.
2. `eas submit --profile production --platform ios` — upload pra TestFlight.
3. Aguarda Apple processar (~30min).
4. No App Store Connect:
   - Preenche metadata (section 2 acima).
   - Anexa screenshots (section 1).
   - Anexa icone 1024x1024 (se ainda nao).
   - Preenche App Privacy (section 3).
   - Submit pra review.
5. Aguarda review Apple (3-10 dias primeira vez, 1-2 dias updates).
6. Se aprovado: release manual no App Store Connect (escolher "Automatico"
   ou "Manual").

### Android (Play Internal -> Production)

1. `eas build --profile production --platform android` — gera `.aab`.
2. `eas submit --profile production --platform android` — upload pra track
   `internal`.
3. No Google Play Console:
   - Preenche metadata (section 2 acima).
   - Anexa screenshots + feature graphic (section 1).
   - Preenche Data Safety (section 3).
   - Preenche Content Rating (IARC questionario).
4. Promove de `internal` -> `closed testing` -> `open testing` -> `production`
   quando estiver confiante.
5. Review Google: 1-7 dias primeira vez, 1-2 dias updates.

---

## 6. Pos-release

- [ ] Monitorar crash reports (Sentry/Crashlytics quando plugado — hoje nao).
- [ ] Responder primeiras reviews em < 48h.
- [ ] Preparar 1.0.1 com hotfixes dentro da primeira semana se surgir bug
      critico.
- [ ] Compartilhar link do app nas redes sociais + newsletter.

---

## 7. Gates de qualidade antes do submit

Rode nesta ordem (nao pula):

1. [ ] `git status` clean em `track/front-mobile`.
2. [ ] `TECH-DEBT.md` revisado — nenhum item marcado como "alvo: este sprint"
      sem resolucao.
3. [ ] `eas build --profile preview --platform all` passando em device fisico
      (Android + iOS).
4. [ ] Smoke manual: login, abre curso, toca video (HLS), chat funciona, quiz
      gera, gamificacao atualiza, offline banner aparece ao desligar rede,
      orientation funciona (portrait default + landscape so fullscreen).
5. [ ] Versao bumpada em `app.json` (`1.0.0` -> `1.0.1` etc).
6. [ ] Release notes escritas.
7. [ ] Screenshots prontos (nas resolucoes da secao 1).
8. [ ] Metadata de loja pronto (secao 2).
9. [ ] Privacy policy publicada e acessivel (secao 3).

So depois desses 9 gates, rodar `eas build --profile production --platform all`
e seguir section 5.
