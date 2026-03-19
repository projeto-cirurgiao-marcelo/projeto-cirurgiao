'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  PageTransition,
  FadeIn,
  StaggerContainer,
  StaggerItem,
  AnimatedTabContent,
  ScaleIn,
} from '@/components/shared/page-transition';
import {
  Trophy,
  Flame,
  Star,
  Target,
  Medal,
  Crown,
  Zap,
  BookOpen,
  Clock,
  TrendingUp,
  ChevronRight,
  Lock,
  CheckCircle2,
  Sparkles,
  Users,
  Calendar,
  Award,
  Shield,
  Heart,
  Eye,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { useGamificationStore } from '@/lib/stores/gamification-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { LEVELS, RARITY_LABELS } from '@/lib/gamification';
import type { Badge, LeaderboardEntry } from '@/lib/gamification';

const rarityConfig = {
  common: { label: 'Comum', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', ring: '' },
  rare: { label: 'Raro', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', ring: 'ring-1 ring-blue-200' },
  epic: { label: 'Épico', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', ring: 'ring-1 ring-purple-300' },
  legendary: { label: 'Lendário', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', ring: 'ring-2 ring-amber-300' },
};

const BADGE_ICON_MAP: Record<string, React.ElementType> = {
  Play: BookOpen, MonitorPlay: Eye, Tv: Eye, Film: Eye,
  GraduationCap: Award, Award: Award, Zap: Zap,
  ClipboardCheck: Target, Star: Star, Stars: Sparkles,
  Flame: Flame, Trophy: Trophy, MessageSquare: MessageSquare,
  HandHelping: Heart, Crown: Crown, ThumbsUp: TrendingUp,
  TrendingUp: TrendingUp, Calendar: Calendar, CalendarCheck: Calendar,
  CalendarHeart: Heart, Rocket: Zap, Sunrise: Star,
  Moon: Eye, Bot: Sparkles, NotebookPen: BookOpen, Medal: Medal,
};

function getBadgeIcon(iconName: string): React.ElementType {
  return BADGE_ICON_MAP[iconName] || Award;
}

type Tab = 'overview' | 'achievements' | 'leaderboard';

export default function GamificationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const currentUser = useAuthStore((s) => s.user);

  const {
    profile, isLoadingProfile, fetchProfile,
    badges, badgesSummary, isLoadingBadges, fetchBadges,
    leaderboard, isLoadingLeaderboard, fetchLeaderboard,
    challenges, isLoadingChallenges, fetchChallenges,
  } = useGamificationStore();

  useEffect(() => {
    fetchProfile();
    fetchBadges();
    fetchLeaderboard('weekly');
    fetchChallenges();
  }, [fetchProfile, fetchBadges, fetchLeaderboard, fetchChallenges]);

  if (isLoadingProfile && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Carregando gamificação...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const xpPercent = profile.level.progressPercent;
  const weeklyXp = profile.xp.weekEarned;
  const weeklyGoal = 500;
  const weeklyPercent = Math.round((weeklyXp / weeklyGoal) * 100);
  const unlockedCount = badgesSummary?.unlocked || 0;
  const totalBadges = badgesSummary?.total || badges.length;

  const dailyChallenges = challenges?.daily || [];
  const firstActiveChallenge = dailyChallenges.find(c => c.status === 'active') || dailyChallenges[0];

  const leaderboardEntries = leaderboard?.entries || [];

  return (
    <PageTransition>
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-emerald-600 p-6 sm:p-8 mb-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white/30 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl sm:text-4xl font-extrabold text-white">{profile.level.current}</p>
                  <p className="text-[10px] sm:text-xs font-semibold text-white/80 uppercase tracking-wider">Nível</p>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow-lg">
                <Star className="w-4 h-4 text-amber-800 fill-amber-800" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
                  <Shield className="w-3 h-3" />
                  {profile.level.title}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
                Suas Conquistas
              </h1>

              <div className="max-w-md">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-semibold text-white/90">{profile.xp.total.toLocaleString()} XP</span>
                  <span className="text-white/60">{profile.level.xpForNextLevel.toLocaleString()} XP</span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400 transition-all duration-700 ease-out"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                <p className="text-xs text-white/60 mt-1">
                  {(profile.level.xpForNextLevel - profile.xp.total).toLocaleString()} XP para o nivel {profile.level.current + 1}
                </p>
              </div>
            </div>

            <div className="flex-shrink-0 text-center bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/10">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="w-6 h-6 text-orange-300 fill-orange-300" />
                <span className="text-3xl font-extrabold text-white">{profile.streak.current}</span>
              </div>
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Dias seguidos</p>
              <p className="text-[10px] text-white/50 mt-0.5">Recorde: {profile.streak.longest}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-white rounded-xl p-1 border border-gray-200 shadow-sm max-w-fit">
          {([
            { key: 'overview', label: 'Visão Geral', icon: Zap },
            { key: 'achievements', label: 'Conquistas', icon: Trophy },
            { key: 'leaderboard', label: 'Ranking', icon: Users },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200',
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <AnimatedTabContent activeKey="overview">
          <div className="space-y-6">
            <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Horas Estudadas', value: `${Math.round(profile.stats.totalWatchTimeMinutes / 60)}h`, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Cursos Completos', value: profile.stats.coursesCompleted, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Vídeos Assistidos', value: profile.stats.videosCompleted, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Respostas no Fórum', value: profile.stats.forumReplies, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((stat, i) => (
                <StaggerItem key={i}>
                <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', stat.bg)}>
                      <stat.icon className={cn('w-5 h-5', stat.color)} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
                </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Weekly Goal */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Target className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-gray-900">Meta Semanal</h3>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">{Math.min(weeklyPercent, 100)}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                    style={{ width: `${Math.min(weeklyPercent, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    <span className="font-semibold text-gray-900">{weeklyXp}</span> / {weeklyGoal} XP
                  </span>
                  <span className="text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Redefine em 3 dias
                  </span>
                </div>
              </div>

              {/* Weekly Challenge */}
              {firstActiveChallenge && (
              <div className="relative overflow-hidden bg-white rounded-xl border border-amber-200 p-6">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-8 -mt-8" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{firstActiveChallenge.title}</h3>
                        <p className="text-xs text-gray-500">Desafio ativo</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                      +{firstActiveChallenge.xpReward} XP
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{firstActiveChallenge.description}</p>
                  <div className="h-2.5 bg-amber-100 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                      style={{ width: `${firstActiveChallenge.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{firstActiveChallenge.current}</span> / {firstActiveChallenge.target}
                  </p>
                </div>
              </div>
              )}
            </div>

            {/* Recent Achievements */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Conquistas Recentes</h3>
                    <p className="text-xs text-gray-500">{unlockedCount} de {totalBadges} desbloqueadas</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('achievements')}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  Ver todas
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {badges.slice(0, 4).map(ach => {
                  const config = rarityConfig[ach.rarity] || rarityConfig.common;
                  const IconComp = getBadgeIcon(ach.icon);
                  const isUnlocked = ach.unlockedAt !== null;
                  return (
                    <div
                      key={ach.slug}
                      className={cn(
                        'relative rounded-xl border p-4 text-center transition-all duration-200',
                        isUnlocked
                          ? `${config.bg} ${config.border} ${config.ring} hover:shadow-md`
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      )}
                    >
                      <div className={cn(
                        'w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center',
                        isUnlocked ? 'bg-white shadow-sm' : 'bg-gray-200'
                      )}>
                        {isUnlocked ? (
                          <IconComp className={cn('w-6 h-6', config.text)} />
                        ) : (
                          <Lock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-900 mb-0.5">{ach.name}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{ach.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rank Progression */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900">Progressão de Patentes</h3>
              </div>
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-4">
                  {LEVELS.map((rank) => {
                    const isCurrent = rank.level === profile.level.current;
                    const isPast = profile.xp.total >= rank.xpRequired;
                    return (
                      <div key={rank.title} className="flex items-center gap-4 relative">
                        <div className={cn(
                          'relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                          isCurrent
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md ring-4 ring-blue-100'
                            : isPast
                            ? 'bg-blue-100 border-blue-300 text-blue-700'
                            : 'bg-gray-100 border-gray-300 text-gray-400'
                        )}>
                          {isCurrent ? (
                            <Star className="w-4 h-4 fill-current" />
                          ) : isPast ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Lock className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <p className={cn(
                              'font-semibold text-sm',
                              isCurrent ? 'text-blue-700' : isPast ? 'text-gray-900' : 'text-gray-400'
                            )}>
                              {rank.title}
                              {isCurrent && (
                                <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold uppercase">
                                  Atual
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400">Nível {rank.level}+</p>
                          </div>
                          <span className={cn('text-xs font-medium', isPast ? 'text-gray-500' : 'text-gray-400')}>
                            {rank.xpRequired.toLocaleString()} XP
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          </AnimatedTabContent>
        )}

        {activeTab === 'achievements' && (
          <AnimatedTabContent activeKey="achievements">
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Todas as Conquistas</h2>
                <p className="text-sm text-gray-500">{unlockedCount} de {totalBadges} desbloqueadas</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-40 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                    style={{ width: `${totalBadges > 0 ? (unlockedCount / totalBadges) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-700">
                  {totalBadges > 0 ? Math.round((unlockedCount / totalBadges) * 100) : 0}%
                </span>
              </div>
            </div>

            {isLoadingBadges ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {badges.map(ach => {
                const config = rarityConfig[ach.rarity] || rarityConfig.common;
                const IconComp = getBadgeIcon(ach.icon);
                const isUnlocked = ach.unlockedAt !== null;
                const progress = !isUnlocked && ach.progress
                  ? ach.progress.percent
                  : null;

                return (
                  <StaggerItem key={ach.slug}>
                  <div
                    className={cn(
                      'relative rounded-xl border p-5 transition-all duration-200',
                      isUnlocked
                        ? `bg-white ${config.border} ${config.ring} hover:shadow-lg hover:-translate-y-0.5`
                        : 'bg-gray-50 border-gray-200'
                    )}
                  >
                    <span className={cn(
                      'absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                      config.bg, config.text
                    )}>
                      {config.label}
                    </span>

                    <div className={cn(
                      'w-14 h-14 rounded-xl mb-4 flex items-center justify-center',
                      isUnlocked ? config.bg : 'bg-gray-200'
                    )}>
                      {isUnlocked ? (
                        <IconComp className={cn('w-7 h-7', config.text)} />
                      ) : (
                        <Lock className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    <h4 className={cn('font-bold mb-1', isUnlocked ? 'text-gray-900' : 'text-gray-500')}>
                      {ach.name}
                    </h4>
                    <p className="text-sm text-gray-500 mb-3">{ach.description}</p>

                    {isUnlocked ? (
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                          <Zap className="w-3 h-3" />
                          Desbloqueada
                        </span>
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    ) : progress !== null && ach.progress ? (
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-gray-500">{ach.progress.current}/{ach.progress.target}</span>
                          <span className="font-medium text-gray-600">{progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gray-400 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
                        <Lock className="w-3 h-3" />
                        Bloqueada
                      </span>
                    )}
                  </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
            )}
          </div>
          </AnimatedTabContent>
        )}

        {activeTab === 'leaderboard' && (
          <AnimatedTabContent activeKey="leaderboard">
          <div className="space-y-6">
            {isLoadingLeaderboard ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : leaderboardEntries.length > 0 ? (
            <>
            {/* Top 3 Podium (só mostra se houver 3+) */}
            {leaderboardEntries.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
              <div className="flex flex-col items-center pt-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-lg sm:text-xl font-bold text-gray-700 border-4 border-gray-300 shadow-md">
                  {leaderboardEntries[1].displayName.split(' ').map(n => n[0]).join('').slice(0,2)}
                </div>
                <div className="w-8 h-8 -mt-3 rounded-full bg-gray-400 text-white flex items-center justify-center text-sm font-bold shadow-sm z-10">2</div>
                <p className="text-sm font-bold text-gray-900 mt-2 text-center">{leaderboardEntries[1].displayName}</p>
                <p className="text-xs text-gray-500">{leaderboardEntries[1].xpEarned.toLocaleString()} XP</p>
              </div>

              <div className="flex flex-col items-center">
                <Crown className="w-8 h-8 text-amber-500 mb-1" />
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-xl sm:text-2xl font-bold text-amber-900 border-4 border-amber-400 shadow-lg ring-4 ring-amber-200">
                  {leaderboardEntries[0].displayName.split(' ').map(n => n[0]).join('').slice(0,2)}
                </div>
                <div className="w-9 h-9 -mt-3 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold shadow-md z-10">1</div>
                <p className="text-sm font-bold text-gray-900 mt-2 text-center">{leaderboardEntries[0].displayName}</p>
                <p className="text-xs text-gray-500">{leaderboardEntries[0].xpEarned.toLocaleString()} XP</p>
              </div>

              <div className="flex flex-col items-center pt-12">
                <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-orange-200 to-orange-400 flex items-center justify-center text-base sm:text-lg font-bold text-orange-800 border-4 border-orange-300 shadow-md">
                  {leaderboardEntries[2].displayName.split(' ').map(n => n[0]).join('').slice(0,2)}
                </div>
                <div className="w-7 h-7 -mt-3 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold shadow-sm z-10">3</div>
                <p className="text-sm font-bold text-gray-900 mt-2 text-center">{leaderboardEntries[2].displayName}</p>
                <p className="text-xs text-gray-500">{leaderboardEntries[2].xpEarned.toLocaleString()} XP</p>
              </div>
            </div>
            )}

            {/* Full Leaderboard */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Ranking Completo</h3>
                <p className="text-sm text-gray-500">Classificação baseada em XP total</p>
              </div>
              <div className="divide-y divide-gray-100">
                {leaderboardEntries.map((entry) => {
                  const isCurrentUser = entry.userId === currentUser?.id;
                  return (
                  <div
                    key={entry.rank}
                    className={cn(
                      'flex items-center gap-4 px-6 py-4 transition-colors',
                      isCurrentUser
                        ? 'bg-blue-50 border-l-4 border-l-blue-500'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    <span className={cn(
                      'w-8 text-center font-bold text-sm',
                      entry.rank <= 3 ? 'text-amber-600' : 'text-gray-400'
                    )}>
                      {entry.rank <= 3 ? (
                        <Medal className={cn(
                          'w-5 h-5 mx-auto',
                          entry.rank === 1 ? 'text-amber-500' : entry.rank === 2 ? 'text-gray-400' : 'text-orange-500'
                        )} />
                      ) : (
                        `#${entry.rank}`
                      )}
                    </span>
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                      isCurrentUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                    )}>
                      {entry.displayName.split(' ').map(n => n[0]).join('').slice(0,2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'font-semibold text-sm',
                        isCurrentUser ? 'text-blue-700' : 'text-gray-900'
                      )}>
                        {entry.displayName}
                        {isCurrentUser && (
                          <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                            VOCÊ
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">Nível {entry.level}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-gray-900">{entry.xpEarned.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">XP</p>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
            </>
            ) : (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Ranking indisponível</p>
              </div>
            )}
          </div>
          </AnimatedTabContent>
        )}

      </div>
    </div>
    </PageTransition>
  );
}
