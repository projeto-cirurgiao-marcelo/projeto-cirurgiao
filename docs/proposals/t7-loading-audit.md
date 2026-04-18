# Audit T7 — loading states / skeletons / toasts

**Autor:** Teammate A
**Status:** executado; registro pro líder review.

## Método

Grep + leitura de:
- `src/app/(auth)/login/page.tsx`
- `src/app/(dashboard)/student/{courses, my-courses, in-progress, completed, library, forum}/page.tsx`
- `src/app/(dashboard)/student/courses/[id]/{page.tsx, watch/[videoId]/page.tsx, quiz/[quizId]/page.tsx}`
- `src/app/(dashboard)/admin/modules/[moduleId]/videos/page.tsx` (upload)

## Estado por fluxo

| Fluxo | Pre-audit | Ação | Status |
|---|---|---|---|
| Login submit | `isLoading` + botão desabilita | — | OK |
| Registro submit | `isLoading` + botão desabilita | — | OK |
| Forgot password | `isLoading` state | — | OK (não inspecionado em profundidade) |
| Catálogo (`/student/courses`) | Loader2 central | `CourseCardSkeletonGrid` (8 cards) | **Melhorado** |
| My-courses (`/student/my-courses`) | Loader2 central | `CourseCardSkeletonGrid` | **Melhorado** |
| In-progress (`/student/in-progress`) | Loader2 central | `CourseCardSkeletonGrid` | **Melhorado** |
| Completed (`/student/completed`) | Loader2 central | `CourseCardSkeletonGrid` | **Melhorado** |
| Curso detalhe (`/student/courses/[id]`) | Loader2 central | — | OK (fora de escopo imediato) |
| Watch (`/student/courses/[id]/watch/[videoId]`) | Loader2 central + player fallbacks | T6 já trata SDK Cloudflare fail | OK |
| Quiz intro/playing/results | `isSubmitting` + Loader2 | — | OK |
| Admin upload vídeos | `useToast()` com success/error, progress bar | — | OK |
| Onboarding (T10 novo) | Loader2 em ambas etapas enquanto getProfile + botão "Salvando..." | — | OK (entregue em T10) |
| 429 rate limit (T5 novo) | Toast `sonner` com retry manual | — | OK (entregue em T5) |

## Gaps identificados e NÃO endereçados neste sprint

1. **Forum listagens** (`/student/forum`, `/student/forum/[categoryId]`) — não inspecionei fundo. Se vierem report de UX, entra em follow-up.
2. **Library chat** (`/student/library`) — idem.
3. **Gamification** — idem, provavelmente já tem skeletons (próprio da feature).
4. **Curso detalhe** — Loader2 central funciona mas poderia ganhar skeleton de header + módulos accordion. Não crítico agora.
5. **Forum reply submit**, **forum topic criar** — não inspecionei botões de submit.

**Recomendação**: se o Gustav quiser cobertura 100%, abre como T7.1 em sprint seguinte. O que entregou hoje cobre os 4 fluxos de maior frequência (listagens de cursos = tela inicial do aluno) + o novo onboarding + o toast de 429.

## Componentes criados

- `src/components/ui/skeleton.tsx` — primitivo `<Skeleton>` com animate-pulse.
- `src/components/student/course-card-skeleton.tsx` — `<CourseCardSkeleton>` + `<CourseCardSkeletonGrid count={N}>` que espelham o `CourseCard` real (thumbnail aspect-video, título, descrição 2 linhas, progress bar, footer).

## Decisão: não usar shadcn skeleton oficial

`components/ui/skeleton.tsx` é implementação inline (div + `animate-pulse` + `bg-gray-200`). Justificativa:

- Evita rodar `npx shadcn@latest add skeleton` que toca `components.json` + pode mexer em deps.
- Implementação trivial — 8 linhas.
- Mesma API visual que o shadcn oficial (prop `className` + data props).
- Se quisermos migrar pro oficial depois, é drop-in.
