import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  color?: 'primary' | 'success' | 'warning' | 'secondary';
}

const colorConfig = {
  primary: {
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    trendUp: 'text-blue-600',
  },
  success: {
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    trendUp: 'text-emerald-600',
  },
  warning: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    trendUp: 'text-amber-600',
  },
  secondary: {
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    trendUp: 'text-gray-600',
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'primary',
}: StatCardProps) {
  const config = colorConfig[color];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 mb-1">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={cn(
                  'inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-bold',
                  trend.value >= 0
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-600'
                )}
              >
                {trend.value >= 0 ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-xs text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn('w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0', config.iconBg)}>
          <Icon className={cn('h-5 w-5', config.iconColor)} />
        </div>
      </div>
    </div>
  );
}
