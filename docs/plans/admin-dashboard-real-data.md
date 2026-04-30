# Plano: Admin Dashboard com Dados Reais + Cache/Cron

**Status:** Proposto — aguardando greenlight
**Owner:** TBD
**Criado em:** 2026-04-30
**Estimativa total:** 5-7h (sem cache/cron) + 2-3h (cache/cron)

---

## 1. Contexto

`/admin/page.tsx` mistura dados reais e mockups:

| Métrica | Estado atual | Origem |
|---|---|---|
| `totalStudents` | **real** | soma `course._count.enrollments` |
| `totalCourses` | **real** | `coursesData.length` |
| `totalHours` | **real** | soma `video.duration` |
| `completionRate` | **mock** | hardcoded `0` |
| Trends (`12.5%`, `8.2%`, `5.1%`) | **mock** | hardcoded |
| `recentActivities` | **mock** | array hardcoded com nomes fake |
| Chart "Matrículas" | **mock** | placeholder `<div>` |

Objetivo: substituir todos os mocks por dados reais agregados do banco, com camada de cache pra suportar crescimento.

---

## 2. Backend — Endpoints

Módulo novo: `backend-api/src/modules/admin-dashboard/`

### 2.1 `GET /admin/dashboard/stats`

**Auth:** `FirebaseAuthGuard` + `RolesGuard` + `@Roles(Role.ADMIN)`

**Response:**
```ts
interface DashboardStats {
  totalStudents: number;
  totalStudentsTrendPct: number;     // % vs 30d atrás
  totalCourses: number;
  totalCoursesTrendPct: number;
  totalHours: number;                 // segundos / 3600 → horas
  totalHoursTrendPct: number;
  completionRate: number;             // 0-100, média % progresso por enrollment ativa
  completionRateTrendPct: number;
  generatedAt: string;                // ISO timestamp
  cacheHit: boolean;                  // pra debug/observabilidade
}
```

**Cálculos SQL (Prisma):**
- `totalStudents`: `prisma.user.count({ where: { role: 'STUDENT', deletedAt: null } })`
- `totalCourses`: `prisma.course.count({ where: { isPublished: true, deletedAt: null } })`
- `totalHours`: `SUM(videos.duration) / 3600` (raw query agregada em todos vídeos publicados)
- `completionRate`: por enrollment, `(videos_assistidos / videos_total_curso) * 100`, depois média
- Trends: snapshot atual − snapshot 30 dias atrás (precisa de tabela `dashboard_metrics_history` ou recalc on-the-fly via filtro `createdAt < NOW() - 30d`)

### 2.2 `GET /admin/dashboard/activity?limit=10`

**Response:**
```ts
interface ActivityItem {
  id: string;
  user: { id: string; name: string; avatarUrl?: string };
  action: 'enrolled' | 'completed_video' | 'completed_quiz' | 'completed_course' | 'started_module';
  target: { type: 'course' | 'module' | 'video' | 'quiz'; id: string; title: string };
  occurredAt: string;
}
```

**Fontes (UNION ordenado por timestamp DESC):**
- `Enrollment.createdAt` → action: `enrolled`
- `VideoProgress.completedAt IS NOT NULL` → `completed_video`
- `QuizAttempt.completedAt IS NOT NULL` → `completed_quiz`
- `Enrollment.completedAt IS NOT NULL` → `completed_course`

Implementação: query única raw SQL com `UNION ALL` + `LIMIT N` + JOIN nas tabelas relacionadas pra hidratar `user.name` e `target.title`.

### 2.3 `GET /admin/dashboard/enrollments-chart?range=6m&granularity=month`

**Query params:**
- `range`: `7d` | `30d` | `6m` | `1y`
- `granularity`: `day` | `week` | `month`

**Response:**
```ts
interface EnrollmentsChart {
  buckets: Array<{
    period: string;          // ex: '2026-04' ou '2026-04-30'
    enrollments: number;
    completions: number;     // bonus: enrollments completas no período
  }>;
}
```

**SQL:**
```sql
SELECT
  DATE_TRUNC('month', "createdAt") AS period,
  COUNT(*) AS enrollments,
  COUNT(*) FILTER (WHERE "completedAt" IS NOT NULL) AS completions
FROM "Enrollment"
WHERE "createdAt" >= NOW() - INTERVAL '6 months'
GROUP BY period
ORDER BY period ASC;
```

---

## 3. Cache — Estratégia em camadas

### Fase 1 (sem cache, deploy inicial)
Endpoints calculam on-the-fly. Aceitável até ~5k enrollments / ~100 cursos.

### Fase 2 (cache em memória — Redis opcional)
- Adicionar `@nestjs/cache-manager` + `cache-manager-ioredis-yet` (se Redis já disponível) ou `cache-manager` em memória local.
- TTL por endpoint:
  - `/stats` → 5min
  - `/activity` → 30s (mais dinâmico)
  - `/enrollments-chart` → 15min
- Chave: `admin:dashboard:<endpoint>:<paramsHash>`
- Invalidação: nenhuma — TTL natural resolve.

**Cloud Run + Redis:** já existe Memorystore? Se não, fase 2 fica em memória local (cada instância tem cache próprio — aceitável pra tráfego admin baixo).

### Fase 3 (tabela materializada + cron)

Trade-off: cache TTL não cobre trends históricos (precisaria recalc periódico). Tabela materializada resolve.

**Schema novo:**
```prisma
model DashboardSnapshot {
  id                   String   @id @default(uuid())
  capturedAt           DateTime @default(now())
  totalStudents        Int
  totalCourses         Int
  totalHours           Int      // segundos
  completionRate       Float    // 0-100
  // Buckets pré-agregados
  enrollmentsLast7d    Int
  enrollmentsLast30d   Int
  // ...

  @@index([capturedAt])
}
```

**Cron (`@nestjs/schedule`):**
- `*/15 * * * *` — refresh `DashboardSnapshot` (15 min)
- Endpoint `/stats` lê o snapshot mais recente em vez de calcular
- Trends comparam snapshot atual vs snapshot >= 30d atrás

**Vantagens:**
- Endpoints viram `findFirst orderBy capturedAt desc` (microssegundos)
- Trends precisos sem janela móvel custosa
- Histórico permite gráficos de evolução

**Desvantagem:**
- Atraso máximo de 15min nos números (aceitável pra dashboard admin)

---

## 4. Frontend

### 4.1 Lib de chart

Adicionar `recharts` (~30KB gz, tree-shakeable).
```bash
cd frontend-web && npm install recharts
```

Alternativas avaliadas:
- `chart.js` + `react-chartjs-2`: mais pesado (~70KB), API imperativa
- `victory`: tamanho similar mas API mais verbosa
- `tremor`: lib completa de dashboards mas adiciona dependências grandes

`recharts` ganha por leveza + compatibilidade SSR + componentes React idiomáticos.

### 4.2 Service novo

`frontend-web/src/lib/api/admin-dashboard.service.ts`:
```ts
export const adminDashboardService = {
  async getStats(): Promise<DashboardStats>,
  async getActivity(limit = 10): Promise<ActivityItem[]>,
  async getEnrollmentsChart(range: string, granularity: string): Promise<EnrollmentsChart>,
};
```

### 4.3 Refactor `admin/page.tsx`

- Remover `recentActivities` hardcoded
- Usar `useEffect` pra carregar 3 endpoints em paralelo via `Promise.all`
- Loading state com `<AtlasSkeletonCard>` por bloco
- Error state com retry
- Trend formatter: positivo verde (`atlas-success`), negativo vermelho (`atlas-danger`)
- Chart: substituir `<div>` placeholder por `<EnrollmentsChart>` (componente novo wrapping recharts)

### 4.4 Componente chart

`frontend-web/src/components/admin/dashboard/enrollments-chart.tsx`:
- `<ResponsiveContainer>` + `<AreaChart>` recharts
- Cores tokens Atlas (`atlas-primary`, `atlas-line`)
- Tooltip custom com tipografia Atlas
- Toggle Mensal/Semanal/Diário (já existe no UI atual — só precisa wire)

---

## 5. Migrations Prisma

Fase 3 only:
```bash
cd backend-api && npx prisma migrate dev --name add_dashboard_snapshot
```

Schema diff: novo `DashboardSnapshot` model.

---

## 6. Tests

### Backend
- `admin-dashboard.service.spec.ts`:
  - completionRate com 0 enrollments (deve retornar 0)
  - trends com snapshot ausente (deve retornar 0)
  - activity feed UNION ordenação correta
  - chart granularity edge cases (range curto sem dados)
- `admin-dashboard.controller.spec.ts`:
  - guard ADMIN-only (estudante recebe 403)

### Frontend
- E2E Playwright: dashboard renderiza dados (não placeholders), chart aparece, trend pct format `+12.5%`.

---

## 7. Roll-out — fases sequenciais

| Fase | Escopo | Esforço | Bloqueio? |
|---|---|---|---|
| 1 | 3 endpoints backend on-the-fly + frontend refactor | 4-5h | nenhum |
| 2 | Cache memória local (TTL) | 30min | depende fase 1 |
| 3 | `DashboardSnapshot` + cron 15min | 2-3h | depende fase 2 — pode ficar p/ próximo sprint |
| 4 | Redis (Memorystore) — se Cloud Run escalar > 1 instância | 1h | só se necessário |

---

## 8. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| `completionRate` calc lento com 50k+ enrollments | Fase 3 (snapshot) cobre; antes disso adicionar índice em `Enrollment.studentId` |
| Activity feed retorna < 10 itens | Aceitar — UI mostra "Sem atividade recente" |
| Trends sem histórico (primeira semana) | Backend retorna `null` em `trendPct`, frontend mostra "—" sem badge |
| Recharts pesa em mobile admin | Lazy import (`dynamic`) só quando dashboard renderiza |
| Cache memory leak em Cloud Run | TTL absoluto + max keys via cache-manager config |

---

## 9. Não-objetivos (out of scope)

- Dashboard analytics avançado (funnel, cohort) — sprint futuro
- Exportar relatórios CSV/PDF — separado
- Real-time updates (WebSocket) — overkill pra dashboard admin
- KPIs de receita/financeiro — não no escopo (ainda sem Iugu integrado)

---

## 10. Decisões pendentes

- [ ] Confirmar disponibilidade Redis em Cloud Run / Memorystore
- [ ] Definir métricas exatas pro `completionRate`: peso por vídeo igual, ou ponderado por duração?
- [ ] Activity feed: incluir ações de admin (curso publicado/módulo criado) ou só de aluno?
- [ ] Chart range default: 6m ou 30d?

---

## 11. Arquivos esperados (delta)

**Backend:**
- `backend-api/src/modules/admin-dashboard/admin-dashboard.module.ts`
- `backend-api/src/modules/admin-dashboard/admin-dashboard.controller.ts`
- `backend-api/src/modules/admin-dashboard/admin-dashboard.service.ts`
- `backend-api/src/modules/admin-dashboard/dto/dashboard-stats.dto.ts`
- `backend-api/src/modules/admin-dashboard/dashboard-snapshot.cron.ts` (fase 3)
- `backend-api/prisma/schema.prisma` (+ DashboardSnapshot, fase 3)
- `backend-api/prisma/migrations/<timestamp>_add_dashboard_snapshot/` (fase 3)

**Frontend:**
- `frontend-web/src/lib/api/admin-dashboard.service.ts`
- `frontend-web/src/components/admin/dashboard/enrollments-chart.tsx`
- `frontend-web/src/app/(dashboard)/admin/page.tsx` (refactor)
- `frontend-web/src/types/admin-dashboard.types.ts`
- `frontend-web/package.json` (+ recharts)

**Docs:**
- `docs/plans/admin-dashboard-real-data.md` (este arquivo)

---

## 12. Próximo passo

Aguardar greenlight. Ao aprovar, fase 1 (endpoints backend + frontend refactor) — entregável em uma única PR.
