# Proposta — UX de rate limit (429) no cliente

**Autor:** Teammate A (frontend-web)
**Status:** proposta — aguardando revisão do líder + C + B
**Destino final:** seção em `backend-api/docs/API-CHANGES-SPRINT.md`
depois de aprovada, pra servir como contrato cross-plataforma (web +
mobile consomem do mesmo jeito).

---

## Contexto

Backend agora aplica throttle por usuário (30 rpm) em endpoints de IA:

- `POST /videos/:videoId/summaries/generate`
- `POST /chat/conversations/:id/messages`
- `POST /library/chat/conversations/:id/messages`
- `POST /library/admin/documents/ingest`
- `POST /videos/:videoId/quizzes/generate`

Resposta em breach: `429 Too Many Requests` + headers
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`,
`Retry-After`. Throttle por IP também pode disparar 429 com o mesmo
shape.

## UX proposta (web)

### Shape do toast

- **Biblioteca:** `sonner` (já instalada, `<Toaster />` em `app/layout.tsx`).
- **Tipo:** `toast.error()` — visual consistente com outros erros, vermelho.
- **Título (fixo):** `"Muitas requisições à IA"`.
- **Descrição (dinâmica):**
  - Se `Retry-After` presente e parseável (delta-seconds OU HTTP-date
    conforme RFC 7231): `"Aguarde ${N} segundo(s) e tente novamente."`
    com `N` singular/plural correto.
  - Se ausente/inválido: `"Aguarde alguns segundos e tente novamente."`
- **Duração do toast:** `max(4000ms, retryAfter * 1000ms)` — toast
  permanece visível até pelo menos o fim do cooldown, se conhecido.
- **Ação de retry:** **nenhum botão no toast.** Retry é feito pelo
  usuário re-submetendo a ação que disparou o 429 (mandar a mensagem
  de novo, clicar "gerar resumo" de novo, etc.).
- **Countdown visível:** nesta v1, não. Toast mostra segundos
  estáticos no momento do erro. Se UX evoluir, podemos adicionar
  componente customizado com countdown ao vivo.

### Lógica do interceptor axios (web)

Implementada em `src/lib/api/client.ts`:

1. Interceptor `response` captura `status === 429` em `apiClient` e
   `uploadClient`.
2. `parseRetryAfter(headers)` extrai segundos — suporta formato
   delta-seconds ("30") e HTTP-date ("Wed, 21 Oct 2026 07:28:00 GMT").
3. `showRateLimitToast(seconds | null)` dispara o toast.
4. **Promise rejeitada continua propagando** — services e componentes
   ainda recebem o erro e podem tratar localmente (spinner off, input
   desabilita, etc.). O toast é aditivo.
5. **Zero retry automático.** Mesmo se `Retry-After` for curto.
   Conforme orientação em `API-CHANGES-SPRINT.md`: "Do not retry
   automatically more than once."

### Comportamento em re-submissão manual

- Usuário clica "Enviar" de novo após toast desaparecer.
- Request parte normal; se ainda dentro da janela, nova 429 dispara
  outro toast.
- Nenhum estado persiste entre submissões — cada request é
  independente do ponto de vista do client.

### Paridade mobile (B)

Recomendado pro mobile:

- Usar `react-native-toast-message` (já instalado) ou equivalente.
- Título + descrição idênticos (PT-BR, singular/plural).
- Duração adaptada pro formato do toast nativo.
- Sem retry automático, sem botão de retry no toast.

Se B preferir componente bottom-sheet ao invés de toast, tudo bem —
desde que título + descrição sigam o contrato textual acima. UX
consistente é mais importante que igualdade visual pixel-perfect.

## Decisões que não caberiam no cliente

- **Valor do throttle (30 rpm)** — config do backend, não do cliente.
- **Quais endpoints contam** — definição do backend via decorator.
- **Tracker key (`req.user.sub` vs IP)** — pure backend.

## Perguntas abertas pro líder / C

1. **Countdown ao vivo** no toast está fora do escopo. OK?
2. **Botão "tentar novamente"** explícito no toast — hoje não existe.
   Proposta é manter sem botão (re-submissão manual pela ação original
   é natural). OK?
3. **Telemetria/analytics** — registramos o 429 em algum lugar além do
   toast? Amplitude/Datadog/logs backend? Não inclui nesta v1.

## Diff resumido (web)

- `src/lib/api/client.ts`:
  - +import `{ toast }` de `sonner`.
  - +`parseRetryAfter(headers)` — RFC 7231 compliant.
  - +`showRateLimitToast(retryAfterSec | null)`.
  - +handler `status === 429` no interceptor `response`.
- Zero mudanças de shape em services — `Promise.reject` continua
  propagando o erro original.
