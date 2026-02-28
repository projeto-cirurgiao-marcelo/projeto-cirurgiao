'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  MonitorPlay,
  ClipboardCheck,
  Clock,
  MessageSquare,
  GraduationCap,
  Target,
} from 'lucide-react';
import type { UserStats } from '@/lib/gamification';

interface StatsPanelProps {
  stats: UserStats;
  className?: string;
}

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ElementType;
  bgClass: string;
  textClass: string;
}

export function StatsPanel({ stats, className }: StatsPanelProps) {
  const formatWatchTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const statItems: StatItem[] = [
    {
      label: 'Vídeos',
      value: stats.videosCompleted,
      icon: MonitorPlay,
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-600',
    },
    {
      label: 'Quizzes',
      value: stats.quizzesPassed,
      icon: ClipboardCheck,
      bgClass: 'bg-green-50',
      textClass: 'text-green-600',
    },
    {
      label: 'Tempo',
      value: formatWatchTime(stats.totalWatchTimeMinutes),
      icon: Clock,
      bgClass: 'bg-purple-50',
      textClass: 'text-purple-600',
    },
    {
      label: 'Média Quiz',
      value: `${stats.quizAverageScore}%`,
      icon: Target,
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-600',
    },
    {
      label: 'Fórum',
      value: stats.forumTopics + stats.forumReplies,
      icon: MessageSquare,
      bgClass: 'bg-pink-50',
      textClass: 'text-pink-600',
    },
    {
      label: 'Cursos',
      value: stats.coursesCompleted,
      icon: GraduationCap,
      bgClass: 'bg-red-50',
      textClass: 'text-red-600',
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 gap-4', className)}>
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg p-2',
                  item.bgClass
                )}
              >
                <Icon className={cn('h-5 w-5', item.textClass)} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-gray-900 tabular-nums leading-tight">
                  {item.value}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {item.label}
                </p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
