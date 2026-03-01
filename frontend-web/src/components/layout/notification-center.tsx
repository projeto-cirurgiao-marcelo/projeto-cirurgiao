'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Bell,
  Check,
  X,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Award,
  Flame,
  Target,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useNotificationStore,
  type NotificationDisplay,
} from '@/lib/stores/notification-store';
import type { GamificationEventType } from '@/lib/gamification';

// ===== Filter Categories =====

type FilterTab = 'all' | 'progress' | 'achievements';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'progress', label: 'Progressao' },
  { key: 'achievements', label: 'Conquistas' },
];

function getCategoryForEvent(
  eventType: GamificationEventType,
): 'progress' | 'achievements' {
  switch (eventType) {
    case 'xp_earned':
    case 'level_up':
    case 'streak_milestone':
      return 'progress';
    case 'badge_unlocked':
    case 'challenge_completed':
      return 'achievements';
    default:
      return 'progress';
  }
}

// ===== Icon Map =====

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles,
  TrendingUp,
  Award,
  Flame,
  Target,
  Bell,
};

function NotificationIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICON_MAP[name] || Bell;
  return <Icon className={className} />;
}

// ===== Time Formatting =====

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHrs = Math.floor(diffMs / 3_600_000);

  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `${diffMin}min`;
  if (diffHrs < 24) return `${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('pt-BR');
}

// ===== Color Helpers =====

function getIconBg(type: NotificationDisplay['type']) {
  const map: Record<string, string> = {
    success: 'bg-emerald-100',
    warning: 'bg-amber-100',
    error: 'bg-red-100',
    info: 'bg-blue-100',
  };
  return map[type] || map.info;
}

function getIconColor(type: NotificationDisplay['type']) {
  const map: Record<string, string> = {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    error: 'text-red-600',
    info: 'text-blue-600',
  };
  return map[type] || map.info;
}

// ===== Notification Item =====

function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
}: {
  notification: NotificationDisplay;
  onMarkRead: () => void;
  onDismiss: () => void;
}) {
  const isUnread = !notification.read;

  return (
    <div
      className={`group relative flex gap-3 px-4 py-3 transition-colors cursor-default ${
        isUnread ? 'bg-blue-50/50' : 'hover:bg-gray-50'
      }`}
    >
      {isUnread && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}

      <div
        className={`flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full ${getIconBg(notification.type)}`}
      >
        <NotificationIcon
          name={notification.icon}
          className={`h-4 w-4 ${getIconColor(notification.type)}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={`text-sm leading-tight ${
              isUnread
                ? 'font-semibold text-gray-900'
                : 'font-medium text-gray-600'
            }`}
          >
            {notification.title}
          </h4>
          <span className="flex-shrink-0 text-[11px] text-gray-400 whitespace-nowrap mt-0.5">
            {formatTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
      </div>

      {isUnread && (
        <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMarkRead(); }}
            className="p-1 rounded-md hover:bg-emerald-100 transition-colors"
            title="Marcar como lida"
          >
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(); }}
            className="p-1 rounded-md hover:bg-gray-200 transition-colors"
            title="Dispensar"
          >
            <X className="h-3.5 w-3.5 text-gray-400" />
          </button>
        </div>
      )}
    </div>
  );
}

// ===== Main Component =====

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    hasLoaded,
    fetchHistory,
    markAsRead,
    markAllAsRead,
    dismiss,
  } = useNotificationStore();

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!hasLoaded) {
      fetchHistory();
    }
  }, [hasLoaded, fetchHistory]);

  const counts = useMemo(() => {
    const progress = notifications.filter(
      (n) => getCategoryForEvent(n.eventType) === 'progress',
    ).length;
    const achievements = notifications.filter(
      (n) => getCategoryForEvent(n.eventType) === 'achievements',
    ).length;
    return { all: notifications.length, progress, achievements };
  }, [notifications]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter(
      (n) => getCategoryForEvent(n.eventType) === activeTab,
    );
  }, [notifications, activeTab]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchHistory();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={`h-5 w-5 transition-transform duration-300 ${open ? 'animate-[bell-ring_0.5s_ease-in-out]' : ''}`} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-[badge-pop_0.3s_ease-out]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[340px] sm:w-[400px] p-0 rounded-xl shadow-xl border border-gray-200"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Notificacoes</h3>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRefresh(); }}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            title="Atualizar"
          >
            <RefreshCw
              className={`h-4 w-4 text-gray-500 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
          {FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab(key); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === key
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {label}
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1 text-[10px] font-bold ${
                  activeTab === key
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[320px] sm:h-[380px]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-4">
                <Inbox className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">Nenhuma notificacao</p>
              <p className="text-xs text-gray-500 mt-1 max-w-[220px]">
                {activeTab === 'all'
                  ? 'Voce esta em dia! Novas conquistas aparecerao aqui.'
                  : 'Nenhuma notificacao nesta categoria.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={() => markAsRead(notification.id)}
                  onDismiss={() => dismiss(notification.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/30">
            {unreadCount > 0 ? (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); markAllAsRead(); }}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 underline-offset-2 hover:underline transition-colors"
              >
                Marcar todas como lidas
              </button>
            ) : (
              <span className="text-xs text-gray-400">Todas lidas</span>
            )}
            <span className="text-[11px] text-gray-400">{notifications.length} notificacoes</span>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
