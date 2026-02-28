'use client';

import { cn } from '@/lib/utils';
import { LevelBadge } from './LevelBadge';
import { XpProgressBar } from './XpProgressBar';
import { StreakDisplay } from './StreakDisplay';
import { useGamification } from '@/hooks/useGamification';
import { Loader2, Trophy } from 'lucide-react';
import Link from 'next/link';

interface GamificationSidebarProps {
  className?: string;
}

/**
 * Widget compacto para sidebar — exibe nivel, XP, streak.
 */
export function GamificationSidebar({ className }: GamificationSidebarProps) {
  const { profile, isLoading } = useGamification();

  if (isLoading || !profile) {
    return (
      <div
        className={cn(
          'rounded-xl bg-white border border-gray-200 shadow-sm p-3 flex items-center justify-center h-24',
          className
        )}
      >
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <Link href="/student/gamification" className="block group">
      <div
        className={cn(
          'rounded-xl bg-white border border-gray-200 shadow-sm p-3 space-y-2.5 transition-shadow group-hover:shadow-md',
          className
        )}
      >
        {/* Level + Streak row */}
        <div className="flex items-center justify-between">
          <LevelBadge
            level={profile.level.current}
            title={profile.level.title}
            color={profile.level.color}
            size="sm"
          />
          <StreakDisplay
            current={profile.streak.current}
            longest={profile.streak.longest}
            todayCompleted={profile.streak.todayCompleted}
            freezesAvailable={profile.streak.freezesAvailable}
            variant="compact"
          />
        </div>

        {/* XP Progress */}
        <XpProgressBar
          currentXp={profile.xp.total}
          xpForCurrentLevel={profile.level.xpForCurrentLevel}
          xpForNextLevel={profile.level.xpForNextLevel}
          progressPercent={profile.level.progressPercent}
          level={profile.level.current}
          levelColor={profile.level.color}
          size="sm"
          showLabels={false}
        />

        {/* Quick stats */}
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span>{profile.xp.total.toLocaleString()} XP total</span>
          <span className="flex items-center gap-0.5">
            <Trophy className="h-3 w-3" />
            +{profile.xp.todayEarned} hoje
          </span>
        </div>
      </div>
    </Link>
  );
}
