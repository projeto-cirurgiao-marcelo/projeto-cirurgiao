# Observabilidade — Error Tracking (Sentry)

Cobre **P1.2** (error/crash tracking) e **P1.16** (scrubbing de PII/segredos) do
checklist go-live, para **backend** e **mobile**. Web fica para decisão separada.

> **Princípio:** a integração é **no-op sem DSN**. Sem as env vars abaixo, nada é
> enviado e o comportamento da aplicação não muda. Nenhum DSN real é commitado.

## Env vars (sem valores — configurar por ambiente)

| Componente | Variável | Efeito |
|---|---|---|
| Backend (`backend-api`) | `SENTRY_DSN` | Ativa o Sentry. Ausente → desativado. |
| Backend | `NODE_ENV` | Vira o `environment` no Sentry (`development` se ausente). |
| Mobile (`mobile-app`) | `EXPO_PUBLIC_SENTRY_DSN` | Ativa o Sentry no app. Ausente → desativado. |

- Backend: em produção o `SENTRY_DSN` deve vir do **Secret Manager** (o `initSentry()`
  roda depois do `loadSecretsIntoEnv`, então pega o valor hidratado). Não colocar DSN
  em `.env` versionado.
- Mobile: `EXPO_PUBLIC_*` é embutido no bundle em build. Tratar o DSN como público
  (é o design do Sentry client), mas ainda assim configurar via env/EAS secret, não hardcoded.

## Comportamento no-op sem DSN

- **Backend** (`backend-api/src/config/sentry.ts`): `initSentry()` retorna `false` e o
  `SentryExceptionFilter` global **não é registrado** — zero mudança no contrato de erro
  da API (respostas continuam as padrão do Nest).
- **Mobile** (`mobile-app/src/config/sentry.ts`): `initSentry()` (chamado em
  `app/_layout.tsx`) retorna `false` e `Sentry.init` nunca roda.

## O que é capturado

- **Backend:** só erros de servidor — `SentryExceptionFilter` reporta exceções não-HTTP
  ou `HttpException` com status ≥ 500. 4xx esperados (validação, auth) **não** viram evento.
- **Mobile:** crashes/erros não tratados via SDK do Sentry RN.

## Scrubbing de PII/segredos

Aplicado em `beforeSend` (e `beforeBreadcrumb` no mobile) antes de qualquer envio.

**Backend** redige:
- Headers: `authorization`, `cookie`, `x-webhook-secret` → `[Redacted]`.
- `request.cookies` e `request.data` (body) → removidos (body não é capturado).
- Campos por nome (em `extra`/`contexts`, recursivo): `password`, `token`,
  `refreshToken`, `firebaseToken`, `jwt`, `secret`.

**Mobile** redige:
- Headers: `authorization`, `cookie`.
- `request.cookies`/`request.data` → removidos.
- Campos por nome (recursivo, em `extra`/`contexts`/`breadcrumbs`): `authorization`,
  `password`, `token`, `refreshToken`, `firebaseToken`, `jwt`, `secret`, `email`.

Coberto por teste: `backend-api/src/config/sentry.spec.ts` e
`mobile-app/__tests__/config/sentry.test.ts`.

## Como validar manualmente depois (sem commitar segredo)

1. Criar um projeto Sentry (ou usar existente) e obter o DSN — **não commitar**.
2. **Backend:** exportar `SENTRY_DSN=<dsn>` no ambiente (local: shell/`.env` não versionado;
   prod: Secret Manager) e reiniciar. Log de boot deve mostrar `Sentry: enabled`.
   Disparar um 500 controlado (ex.: rota que lança) e conferir o evento no painel —
   validar que `Authorization`/tokens aparecem como `[Redacted]`.
3. **Mobile:** exportar `EXPO_PUBLIC_SENTRY_DSN=<dsn>` e rodar o app. Forçar um erro em
   dev e conferir o evento + scrubbing.
4. Opcional: adicionar um helper interno de teste (`Sentry.captureMessage('smoke')`) atrás
   de flag de dev — **não** expor botão/tela ao usuário.

> Não há evento de teste automático nem UI de disparo no app (por design).
