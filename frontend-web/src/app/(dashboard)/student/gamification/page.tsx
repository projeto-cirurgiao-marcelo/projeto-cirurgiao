'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useGamification } from '@/hooks/useGamification';
import { useBadges } from '@/hooks/useBadges';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useChallenges } from '@/hooks/useChallenges';
import { useGamificationStore } from '@/lib/stores/gamification-store';

// Components
import { LevelBadge } from '@/components/gamification/LevelBadge';
import { XpProgressBar } from '@/components/gamification/XpProgressBar';
import { StreakDisplay } from '@/components/gamification/StreakDisplay';
import { StatsPanel } from '@/components/gamification/StatsPanel';
import { XpHistoryFeed } from '@/components/gamification/XpHistoryFeed';
import { BadgeGrid } from '@/components/gamification/BadgeGrid';
import { LeaderboardPodium } from '@/components/gamification/LeaderboardPodium';
import { LeaderboardTable } from '@/components/gamification/LeaderboardTable';
import { ChallengesList } from '@/components/gamification/ChallengesList';
import { LevelUpModal } from '@/components/gamification/LevelUpModal';
import { BadgeUnlockModal } from '@/components/gamification/BadgeUnlockModal';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  LayoutDashboard,
  Trophy,
  Medal,
  Target,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

export default function GamificationPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const { profile, isLoading: profileLoading } = useGamification();
  const { badges, summary: badgesSummary } = useBadges();
  const { leaderboard, period, changePeriod } = useLeaderboard();
  const { challenges } = useChallenges();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || (profileLoading && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with level info */}
        {profile && (
          <motion.div
            className="rounded-xl bg-white border border-gray-200 shadow-sm p-5 sm:p-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <LevelBadge
                  level={profile.level.current}
                  title={profile.level.title}
                  color={profile.level.color}
                  size="lg"
                />
                <div className="flex-1">
                  <XpProgressBar
                    currentXp={profile.xp.total}
                    xpForCurrentLevel={profile.level.xpForCurrentLevel}
                    xpForNextLevel={profile.level.xpForNextLevel}
                    progressPercent={profile.level.progressPercent}
                    level={profile.level.current}
                    levelColor={profile.level.color}
                    size="md"
                  />
                </div>
              </div>

              <StreakDisplay
                current={profile.streak.current}
                longest={profile.streak.longest}
                todayCompleted={profile.streak.todayCompleted}
                freezesAvailable={profile.streak.freezesAvailable}
                variant="full"
              />
            </div>

            {/* Quick XP stats */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
              <span>
                <strong className="text-gray-900">{profile.xp.todayEarned}</strong> XP hoje
              </span>
              <span>
                <strong className="text-gray-900">{profile.xp.weekEarned}</strong> XP esta semana
              </span>
              <span>
                <strong className="text-gray-900">{profile.xp.monthEarned}</strong> XP este mês
              </span>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-11 bg-gray-100 rounded-xl p-1 border-0 shadow-none">
            <TabsTrigger value="overview" className="text-xs sm:text-sm gap-1.5 rounded-lg text-gray-500 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all duration-200">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="badges" className="text-xs sm:text-sm gap-1.5 rounded-lg text-gray-500 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all duration-200">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Conquistas</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="text-xs sm:text-sm gap-1.5 rounded-lg text-gray-500 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all duration-200">
              <Medal className="h-4 w-4" />
              <span className="hidden sm:inline">Ranking</span>
            </TabsTrigger>
            <TabsTrigger value="challenges" className="text-xs sm:text-sm gap-1.5 rounded-lg text-gray-500 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all duration-200">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Desafios</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats */}
            {profile && <StatsPanel stats={profile.stats} />}

            {/* Two columns: History + Quick challenges */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* XP History */}
              <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Atividade Recente
                  </h3>
                </div>
                {profile && (
                  <XpHistoryFeed entries={profile.recentXpHistory} maxItems={8} />
                )}
              </div>

              {/* Quick challenges preview */}
              {challenges && (
                <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <Target className="h-4 w-4 text-blue-500" />
                      Desafios Ativos
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-gray-600 hover:text-gray-900"
                      onClick={() => setActiveTab('challenges')}
                    >
                      Ver todos
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  <ChallengesList challenges={challenges} />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Conquistas
              </h2>
              <Link href="/student/gamification/badges">
                <Button variant="outline" size="sm" className="text-xs border-gray-200 text-gray-600 hover:text-gray-900">
                  Ver página completa
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            <BadgeGrid badges={badges} summary={badgesSummary} />
          </TabsContent>

          {/* Ranking Tab */}
          <TabsContent value="ranking" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Medal className="h-5 w-5 text-amber-500" />
                Ranking
              </h2>
              <div className="flex items-center gap-1">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={period === 'weekly' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => changePeriod('weekly')}
                  >
                    Semanal
                  </Button>
                  <Button
                    variant={period === 'monthly' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => changePeriod('monthly')}
                  >
                    Mensal
                  </Button>
                </div>
                <Link href="/student/gamification/leaderboard">
                  <Button variant="outline" size="sm" className="h-7 text-xs ml-2 border-gray-200">
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>

            {leaderboard && (
              <>
                <LeaderboardPodium entries={leaderboard.entries} />
                <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
                  <LeaderboardTable
                    entries={leaderboard.entries}
                    currentUser={leaderboard.currentUser}
                  />
                </div>
              </>
            )}
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Desafios
              </h2>
            </div>
            {challenges && <ChallengesList challenges={challenges} />}
          </TabsContent>
        </Tabs>
      </div>

      {/* Celebration Modals */}
      <LevelUpModal />
      <BadgeUnlockModal />
    </>
  );
}
