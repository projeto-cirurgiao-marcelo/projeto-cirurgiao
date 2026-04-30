'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EnrollmentsChartBucket } from '@/types/admin-dashboard.types';

interface EnrollmentsChartProps {
  buckets: EnrollmentsChartBucket[];
  granularity: 'day' | 'week' | 'month';
}

const MONTHS_PT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

function formatPeriodLabel(iso: string, granularity: string): string {
  const date = new Date(iso);
  if (granularity === 'month') {
    return MONTHS_PT[date.getUTCMonth()];
  }
  if (granularity === 'week') {
    return `${date.getUTCDate().toString().padStart(2, '0')}/${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
  }
  return `${date.getUTCDate().toString().padStart(2, '0')}/${MONTHS_PT[date.getUTCMonth()]}`;
}

export function EnrollmentsChart({ buckets, granularity }: EnrollmentsChartProps) {
  const data = buckets.map((b) => ({
    label: formatPeriodLabel(b.period, granularity),
    enrollments: b.enrollments,
    completions: b.completions,
  }));

  if (data.length === 0) {
    return (
      <div className="h-48 md:h-64 flex items-center justify-center text-[12.5px] text-atlas-muted-2">
        Sem dados no período selecionado.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="enrollmentsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="rgb(var(--atlas-primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="rgb(var(--atlas-primary))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="completionsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="rgb(16 185 129)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="rgb(16 185 129)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--atlas-line))" />
        <XAxis
          dataKey="label"
          stroke="rgb(var(--atlas-muted-2))"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: 'rgb(var(--atlas-line))' }}
        />
        <YAxis
          stroke="rgb(var(--atlas-muted-2))"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: 'rgb(var(--atlas-line))' }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: 'rgb(var(--atlas-surface))',
            border: '1px solid rgb(var(--atlas-line))',
            borderRadius: 4,
            fontSize: 12,
            color: 'rgb(var(--atlas-ink))',
          }}
          labelStyle={{ fontWeight: 500, color: 'rgb(var(--atlas-ink))' }}
        />
        <Area
          type="monotone"
          dataKey="enrollments"
          stroke="rgb(var(--atlas-primary))"
          fill="url(#enrollmentsGradient)"
          strokeWidth={2}
          name="Matrículas"
        />
        <Area
          type="monotone"
          dataKey="completions"
          stroke="rgb(16 185 129)"
          fill="url(#completionsGradient)"
          strokeWidth={2}
          name="Conclusões"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
