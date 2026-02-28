'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { LeaderboardPodium } from '@/components/gamification/LeaderboardPodium';
import { LeaderboardTable } from '@/components/gamification/LeaderboardTable';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Medal, Users } from 'lucide-react';

export default function LeaderboardPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const { leaderboard, period, isLoading, changePeriod } = useLeaderboard();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || (isLoading && !leaderboard)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/student/gamification')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Medal className="h-6 w-6 text-amber-500" />
              Ranking
            </h1>
            {leaderboard && (
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {leaderboard.totalParticipants} participantes
              </p>
            )}
          </div>
        </div>

        {/* Period toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <Button
            variant={period === 'weekly' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => changePeriod('weekly')}
          >
            Semanal
          </Button>
          <Button
            variant={period === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => changePeriod('monthly')}
          >
            Mensal
          </Button>
        </div>
      </div>

      {leaderboard && (
        <>
          {/* Podium */}
          <LeaderboardPodium entries={leaderboard.entries} />

          {/* Full table */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">
              Classificação completa
            </h2>
            <LeaderboardTable
              entries={leaderboard.entries}
              currentUser={leaderboard.currentUser}
            />
          </div>
        </>
      )}
    </div>
  );
}
