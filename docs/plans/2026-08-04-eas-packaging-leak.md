# EAS Build — vazamento de escopo no empacotamento

> **Data:** 2026-08-04
> **Como apareceu:** durante o estudo de paridade Android
> (`2026-07-30-android-parity-study.md`), ao rodar `eas build:inspect --stage archive`
> antes do primeiro build Android — comando local, que **não** dispara build.
> **Status:** causa raiz identificada, corrigida e provada. Rotação de credenciais é
> decisão do Gustavo; este doc é o insumo dela. **Avaliação LGPD do dump: §5.1** —
> concluída em 2026-08-04 (risco baixo, sem notificação; reavaliável).
> **Escopo desta ação:** empacotamento e higiene local. Nenhuma credencial rotacionada,
> nenhum build disparado, nenhum histórico git reescrito.

---

## 1. Resumo

Todo `eas build` deste projeto enviava para os servidores da Expo, junto com o código do
app, um **dump do banco de produção (51 MB)**, uma **chave de service account GCP**, o
`.env` de desenvolvimento do backend e o `.env.local` do worker Cloudflare.

A causa não é um arquivo mal escrito: é uma **interação entre duas proteções**. O
`.gitignore` é quem protege esses caminhos — e a simples existência de um `.easignore`
**desliga todos os `.gitignore`** no empacotamento do EAS. O `.easignore` da raiz foi
escrito em abril para reduzir o tamanho do upload (excluir `backend-api/`,
`frontend-web/`, `node_modules/`), nunca para segurança, e portanto nunca replicou as
regras de segredo. No instante em que ele passou a existir, tudo que o `.gitignore`
protegia voltou para o tarball.

Corrigido: o tarball caiu de **69 MB / material sensível** para **2,4 MB / zero segredos**.

---

## 2. Causa raiz (com evidência)

### 2.1 Qual `.easignore` o EAS lê

O eas-cli resolve o arquivo a partir do **root do repositório git**, não do diretório do
app. Evidência direta, do próprio CLI em modo debug (`EXPO_DEBUG=1 eas build:inspect`):

```
.easignore exists, deleting files that should be ignored {
  sourceEasignorePath: 'D:\dashboard\next-shadcn-admin-dashboard-main\.easignore'
}
```

Confirmado no código (`eas-cli/build/vcs/clients/git.js`):

```js
const rootPath = await this.getRootPathAsync();            // = git root = raiz do monorepo
const sourceEasignorePath = path.join(rootPath, EASIGNORE_FILENAME);
```

**Consequência:** `mobile-app/.easignore` **nunca é lido pelo EAS**. Ele existia e dava a
impressão de controlar o upload — não controla nada.

### 2.2 A regra que abre o buraco

`eas-cli/build/vcs/local.js`, no comentário da classe `Ignore`:

```
* Inconsistencies with git behavior:
* - node_modules is always ignored,
* - if .easignore exists, .gitignore files are not used.     ← esta
```

Ou seja: `.easignore` **não complementa** o `.gitignore` — ele o **substitui por inteiro**.
Como as proteções do P0.1/P0.2 (`db-backups/`, `gcp-service-account-key/`, `*.env`) vivem
no `.gitignore`, elas deixaram de valer para o empacotamento no dia em que o `.easignore`
apareceu.

### 2.3 Por que ninguém notou

O `.easignore` da raiz **funciona** — ele simplesmente não lista o que interessa. Na
primeira passada eu concluí o contrário ("o `.easignore` da raiz não é aplicado"), porque
vi `backend-api/` dentro do tarball. Estava errado: `backend-api/` estava lá como
**diretório vazio** (0 arquivos) — o padrão `backend-api/` casa o conteúdo, não a entrada
de diretório em si. Verificação que fecha a questão:

```
$ find <tarball>/backend-api  -type f | wc -l   →  0
$ find <tarball>/frontend-web -type f | wc -l   →  0
$ find <tarball>/db-backups   -type f | wc -l   →  1     ← o dump
$ grep -E "db-backups|gcp-service-account|\.env" .easignore
  (nenhuma linha)
```

Teste isolado da própria lib `ignore` do eas-cli, contra o `.easignore` de então:

```
copia  "backend-api"                  ← diretório vazio: sobe a entrada, não o conteúdo
IGNORA "backend-api/src/main.ts"      ← o conteúdo é barrado corretamente
copia  "db-backups/dump.sql.gz"       ← nunca houve regra para isto
```

**Lição de método:** presença de diretório no tarball não é evidência de vazamento;
contagem de arquivos é. A hipótese que eu levantei antes de medir (separadores `\` do
Windows quebrando os padrões) também foi testada e **descartada** — a lib casa
`backend-api\src\main.ts` normalmente.

---

## 3. Correção

Um arquivo alterado de verdade: **`.easignore` da raiz**.

- Replica no `.easignore` as regras de segredo que só existiam no `.gitignore`
  (`.env`, `.env.*`, `db-backups/`, `*.sql.gz`, `*.dump`, `*.backup`,
  `gcp-service-account-key/`, `*-service-account*.json`, `ruvector.db`, `.history/`).
- Exclui `.git` (o `git clone` do EAS o recria no destino; só sai do tarball se listado).
- Exclui os demais componentes e a ferramentaria local de agentes/IDE.
- Mantém `!mobile-app/**` — é o que preserva `mobile-app/.env`,
  `google-services.json` e `GoogleService-Info.plist`, dos quais o build tira a config do
  Firebase enquanto não houver EAS env vars. **Ignorar esses três quebra iOS e Android.**
- Depois do `!mobile-app/**`, reexclui o que é gerado dentro do app
  (`mobile-app/android/`, `mobile-app/ios/`, `node_modules/`, `.expo/`, `coverage/`) —
  em sintaxe gitignore, a última regra que casa é a que vale.
- Cabeçalho no arquivo explicando as duas armadilhas (qual arquivo é lido; `.easignore`
  desliga `.gitignore`), para que a próxima pessoa não repita.

`mobile-app/.easignore` foi mantido com o conteúdo original **mais um aviso** de que não é
usado pelo EAS — apagá-lo seria mais limpo, mas o aviso vale mais que o arquivo.

### Prova

| | Antes | Depois |
|---|---|---|
| Tamanho do tarball | **69 MB** | **2,4 MB** |
| Arquivos | — | 201 (184 são de `mobile-app/`) |
| Dump de produção `*.sql.gz` | **presente (51 MB)** | ausente |
| Chave SA GCP | **presente** | ausente (diretório também) |
| `.env` / `.env.local` da raiz | **presentes** | ausentes |
| `.env.local` do worker Cloudflare | **presente** | ausente |
| `.git` (7,4 MB) | presente | ausente |
| `mobile-app/.env` | presente | **presente** (por design) |
| `google-services.json` / `GoogleService-Info.plist` | presentes | **presentes** (por design) |
| Integridade de `mobile-app/` | — | `app/`, `src/`, `assets/`, `package.json`, `package-lock.json`, configs: todos OK |

Comando de verificação (local, não consome build minutes):

```bash
cd mobile-app
eas build:inspect --platform android --stage archive --output /tmp/t
find /tmp/t -type f | wc -l
find /tmp/t \( -name ".env" -o -name "*.sql.gz" -o -name "*service-account*" \)
```

### Aviso de bare workflow — resolvido

Durante o estudo, `npx expo prebuild` gerou `mobile-app/android/`, e o EAS passou a avisar:

```
Specified value for "android.package" in app.json is ignored because an android
directory was detected in the project. EAS Build will use the value found in the native code.
```

A pasta foi **apagada** (o APK de diagnóstico foi preservado fora do repo) e
`mobile-app/android/` está explicitamente excluída no `.easignore`, então nem reaparece no
tarball se alguém rodar prebuild de novo. `npx expo prebuild --platform android` regenera
quando for preciso.

---

## 4. Inventário de exposição

> Nomes e tipos apenas — nenhum valor foi impresso, copiado ou versionado.

### 4.1 Janela de exposição

O `.easignore` da raiz foi commitado em **2026-04-15** (`e00c319`, autor `gubressan`).
**Antes dessa data o `.gitignore` valia e o empacotamento estava protegido.**

| Build | Data | Plataforma | Status | Exposto? |
|---|---|---|---|---|
| `940659c1` | 03/04/2026 | Android | finished | ❌ não (anterior ao `.easignore`) |
| `2bb63391` | 03/04/2026 | iOS | finished | ❌ não |
| `323c92d3` | 10/04/2026 | iOS | errored | ❌ provavelmente não* |
| `8a83d754` | 10/04/2026 | iOS | canceled | ❌ provavelmente não* |
| `843fea05` | 02/07/2026 | iOS | errored | ✅ **sim** — 🗑️ excluído em 04/08 |
| `b362c64c` | 02/07/2026 | iOS | finished | ✅ **sim** — 🗑️ excluído em 04/08 |
| `c1ba2a49` | 02/07/2026 | iOS | finished | ✅ **sim** — build do go-live iOS; 🗑️ excluído em 04/08 |

Os 3 builds contaminados foram **excluídos do EAS em 2026-08-04**, com autorização do
Gustavo (ver §5.1). `eas build:list` passou a mostrar apenas os builds de 03/04 e 10/04,
anteriores ao `.easignore` e com tarball limpo.

\* Os builds de 10/04 são anteriores ao **commit** do `.easignore` (15/04), mas o arquivo
pode ter existido no working tree antes de ser commitado. Não há como determinar isso a
posteriori. Mesmo no pior caso, nessa data ainda não existiam em disco o dump (03/06) nem
o `.env` da raiz (04/05) — só a chave GCP e o `.env.local` da raiz.

**Conclusão:** 3 uploads em 02/07/2026 carregaram o conjunto completo. Todos disparados
pela conta `projetocirurgiao`.

### 4.2 O que estava nos tarballs

| Item | Tipo | Data do arquivo | Avaliação |
|---|---|---|---|
| `db-backups/projeto_cirurgiao-20260603.sql.gz` | **dump do banco de produção, 51 MB** | 2026-06-03 | **Exposição de dados, não de credencial.** Contém os dados dos alunos daquela data (PII). É o item mais grave e o único que rotação de segredo **não** resolve. |
| `gcp-service-account-key/projeto-cirurgiao-*.json` | chave privada de service account GCP | 2025-11-09 | SA `service-account-pc@projeto-cirurgiao.iam.gserviceaccount.com`, projeto `projeto-cirurgiao`, `private_key_id` `5b9e6caf…`. Já era pendência de rotação no P0.2-B. |
| `.env` (raiz) | env de desenvolvimento do backend | 2026-05-04 | Ver detalhamento abaixo. |
| `.env.local` (raiz) | env do frontend web | 2025-11-09 | Só `NEXT_PUBLIC_*` (Firebase web config, URLs). Já são públicas por natureza — vão no bundle. **Sem ação.** |
| `video-pipeline/cloudflare-worker/.env.local` | `CLOUDFLARE_API_TOKEN` (37 chars) | 2026-04-25 | Token real, distinto do da raiz. |
| `ruvector.db` | base local de ferramentaria de agentes | 2026-05-04 | Sem credencial conhecida; incluído por completude. |

Detalhamento do `.env` da raiz (classificação por heurística — comprimento e formato — sem
leitura de valores):

| Variável | Avaliação |
|---|---|
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | 64 chars cada — **parecem reais** |
| `CLOUDFLARE_API_TOKEN` | 53 chars — **parece real** |
| `OPENAI_API_KEY` | 164 chars — **parece real** |
| `CLOUDFLARE_ACCOUNT_ID` | 32 chars — identificador, não segredo |
| `FIREBASE_PRIVATE_KEY` | 63 chars — **truncado/placeholder** (chave real teria ~1700) |
| `FIREBASE_CLIENT_EMAIL` | placeholder |
| `DATABASE_URL`, `REDIS_HOST`, `API_URL`, `CORS_ORIGINS` | apontam para **localhost** — é `.env` de desenvolvimento |
| `REDIS_PASSWORD` | vazio |

**Atenuante importante:** o `DATABASE_URL` desse arquivo é local, não de produção. O acesso
ao banco de produção **não** vazou por essa via — mas os *dados* de produção vazaram pelo
dump.

### 4.3 Quem tem acesso ao destino

- Projeto EAS `c048ea29-2617-43af-a299-059c5d53b016`, owner: organização
  **`projetocirurgiao`** (conta `contato@projetocirurgiao.app`).
- Todos os 7 builds foram iniciados por `projetocirurgiao`.
- A conta pessoal usada antes nesta máquina (`deixaapp`) **não tem acesso** ao projeto —
  verificado: `Entity not authorized: AppEntity[c048ea29-…], action = READ`.
- **A verificar pelo Gustavo (não dá para listar via CLI):** membros da organização
  `projetocirurgiao` em expo.dev → Settings → Members. Quem for membro teve acesso, via
  dashboard, aos artefatos e ao contexto desses builds.

### 4.4 Achado adicional (fora do escopo desta ação, não tocado)

`backend-api/firebase-service-account.json` (2,4 KB, 2026-01-09) está na árvore do repo.
Está corretamente coberto pelo `.gitignore` do backend
(`backend-api/.gitignore:54: *-service-account*.json`) e **não** entrou nos tarballs
(`backend-api/` sempre foi excluído). Não é exposição via EAS — mas é uma credencial viva
em disco, do mesmo tipo que o P0.2-A mandou tirar da árvore. Fica como recomendação.

---

## 5. Recomendação de rotação (priorizada)

Decisão e execução são do Gustavo. Ordem sugerida — do que tem maior alcance para o que
tem menor, respeitando a regra do P0.2 (**rotacionar só depois** de o consumidor ter
migrado de mecanismo de carga):

| # | Item | Por que primeiro | Observação |
|---|---|---|---|
| 1 | **Chave SA GCP** `service-account-pc@projeto-cirurgiao` | Chave privada real, com alcance de projeto GCP; já era pendência do P0.2-B | Revogar em vez de rotacionar, se ninguém mais a usa. Verificar antes quem consome (o `.env` local aponta para um caminho que **não existe** — `./gcp-service-account-key.json`) |
| 2 | **`CLOUDFLARE_API_TOKEN`** (dois tokens distintos: raiz e worker) | Tokens reais, acesso a R2/Stream/Workers | Reduzir escopo ao mínimo na recriação; mapear consumidores (wrangler, backend) antes |
| 3 | **`OPENAI_API_KEY`** | Chave real; custo direto se abusada | Rotação isolada, sem dependência de deploy |
| 4 | **`JWT_SECRET` / `JWT_REFRESH_SECRET`** | Parecem reais, mas são do `.env` **local** — confirmar se coincidem com os de produção antes de agir | Se coincidirem: rotacionar **por último**, invalida todas as sessões |
| 5 | `FIREBASE_PRIVATE_KEY` / `FIREBASE_CLIENT_EMAIL` do `.env` raiz | Placeholders | **Sem ação** |
| 6 | `NEXT_PUBLIC_*` do `.env.local` | Públicas por design | **Sem ação** |

**Fora da alçada de rotação — decisão separada:** o dump `projeto_cirurgiao-20260603.sql.gz`
é exposição de **dados de alunos**, não de credencial. Trocar segredo não desfaz. A
avaliação e a decisão estão registradas na **§5.1 — Avaliação LGPD**.

---

### 5.1 Avaliação LGPD

> Registro de avaliação **interna** do incidente, para rastreabilidade. Não é parecer
> jurídico. Nenhum dado pessoal ou credencial é reproduzido aqui.

**Fatos apurados**

- O arquivo `db-backups/projeto_cirurgiao-20260603.sql.gz` é um dump do banco de produção
  de **2026-06-03**, contendo dados pessoais de alunos da plataforma.
- Ele foi incluído no pacote de build enviado ao EAS em **3 builds iOS de 02/07/2026**
  (`843fea05` errored, `b362c64c` finished, `c1ba2a49` finished — este último é o build do
  go-live iOS). Ver a tabela da §4.1 para a janela completa.
- Destino do envio: infraestrutura da **Expo/EAS**, no projeto
  `c048ea29-2617-43af-a299-059c5d53b016`, de propriedade da organização
  `projetocirurgiao`.
- A causa (o `.easignore` da raiz desligando os `.gitignore`) foi corrigida em
  **2026-08-04**, com prova de tarball limpo na §3.

**Análise**

- **Não houve divulgação pública.** O destinatário é um **fornecedor de infraestrutura sob
  contrato**, atuando como operador — não um repositório aberto, não um terceiro
  indeterminado. O material ficou no armazenamento de builds do projeto, não em um
  artefato distribuído: **o dump não foi embarcado no app** (entrou no tarball de entrada
  do build, não no `.ipa`), portanto não chegou a nenhum dispositivo de usuário final.
- **Acesso restrito.** O projeto EAS é privado e limitado aos membros da organização
  `projetocirurgiao`. Todos os builds foram disparados pela própria conta da organização.
- **Sem evidência de acesso indevido.** Não há indício de acesso, cópia ou uso do material
  por terceiro não autorizado.
- **Risco de recorrência eliminado.** A correção de 04/08 impede novo envio, e o
  procedimento de verificação (`eas build:inspect --stage archive`) ficou documentado no
  cabeçalho do `.easignore` e na §7.
- **Fator residual — eliminado em 2026-08-04.** O dump permanecia no armazenamento de
  builds do EAS enquanto os artefatos daqueles 3 builds existissem. **Autorizado pelo
  Gustavo, os 3 builds foram excluídos** (`eas build:delete`, 2026-08-04):
  `843fea05`, `b362c64c`, `c1ba2a49` — todos confirmados fora de `eas build:list`. Restam
  apenas os builds de 03/04 e 10/04, anteriores ao `.easignore` e portanto com tarball
  limpo. Não há mais cópia do dump na infraestrutura do EAS.
  *(Nota operacional: `c1ba2a49` era o build do go-live iOS. A exclusão no EAS não afeta a
  distribuição no TestFlight — o binário já estava com a Apple — mas o `.ipa` não é mais
  rebaixável pelo EAS.)*

**Conclusão — aprovada pelo Gustavo em 2026-08-04**

**Risco baixo. Sem notificação à ANPD e sem comunicação aos titulares.** O evento é tratado
como incidente interno de segurança com exposição limitada a operador contratado,
corrigido, sem evidência de acesso indevido e sem probabilidade relevante de risco ou dano
aos titulares.

**Reavaliável** se surgir evidência nova, por exemplo:

- membro não reconhecido na organização Expo;
- indício de acesso, download ou uso do artefato por terceiro;
- constatação de que o material foi replicado para fora da infraestrutura do EAS.

**Ação em aberto (Gustavo):** conferir a lista de membros em
**expo.dev → Settings → Members** da organização `projetocirurgiao` e confirmar que todos
são reconhecidos. Não há comando de CLI para isso — só o dashboard. Se algum membro não for
reconhecido, esta conclusão precisa ser revista.

---

## 6. Higiene local aplicada

`db-backups/` e `gcp-service-account-key/` foram **movidos para fora da árvore do repo**:

```
D:\dashboard\next-shadcn-admin-dashboard-main\db-backups\            → D:\dashboard\_local-nao-versionado\db-backups\
D:\dashboard\next-shadcn-admin-dashboard-main\gcp-service-account-key\ → D:\dashboard\_local-nao-versionado\gcp-service-account-key\
```

Integridade conferida após o move (51 MB e 2,4 KB, mtimes preservados). Nada foi apagado.
Isso fecha a pendência da **fase A do P0.2** que havia voltado a morder — os arquivos
seguiam em disco dentro do repo, e foi exatamente essa presença que o `.easignore`
transformou em upload.

Nenhum histórico git foi tocado: os arquivos nunca foram versionados; o problema era
disco + tarball.

---

## 7. O que fica de aprendizado operacional

1. **`.easignore` não complementa o `.gitignore` — substitui.** Ao adicionar um caminho
   sensível ao `.gitignore`, adicione ao `.easignore` também. Está escrito no cabeçalho do
   arquivo agora.
2. **O `.easignore` que vale é o da raiz do repo git**, não o do diretório do app. Em
   monorepo isso é contraintuitivo.
3. **`eas build:inspect --stage archive` é gratuito e local.** Deveria rodar antes de
   qualquer primeiro build em ambiente novo — foi ele que achou isto.
4. **Contar arquivos, não olhar diretórios.** Diretório vazio no tarball é ruído; foi o que
   me levou a um diagnóstico errado na primeira passada.
