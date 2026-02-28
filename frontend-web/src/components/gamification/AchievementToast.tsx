'use client';

import { toast } from 'sonner';
import { RARITY_COLORS, RARITY_LABELS } from '@/lib/gamification';
import type { BadgeRarity } from '@/lib/gamification';

interface AchievementToastOptions {
  title: string;
  description: string;
  icon?: string;
  rarity?: BadgeRarity;
  xp?: number;
}

/**
 * Mostra um toast customizado para conquistas de gamificacao.
 * Usa Sonner (ja configurado no projeto).
 */
export function showAchievementToast({
  title,
  description,
  rarity = 'common',
  xp,
}: AchievementToastOptions) {
  const colors = RARITY_COLORS[rarity];
  const rarityLabel = RARITY_LABELS[rarity];

  toast.custom(
    (t) => (
      <div
        className="flex items-start gap-3 rounded-xl border-2 bg-white p-4 shadow-xl dark:bg-gray-900"
        style={{
          borderColor: colors.border,
          boxShadow: `0 4px 20px ${colors.glow}`,
        }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
          }}
        >
          🏆
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm text-foreground truncate">
              {title}
            </p>
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
              }}
            >
              {rarityLabel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          {xp && (
            <p className="text-xs font-semibold text-amber-500 mt-1">
              +{xp} XP
            </p>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(t)}
          className="text-muted-foreground hover:text-foreground text-sm shrink-0"
        >
          &times;
        </button>
      </div>
    ),
    {
      duration: 5000,
      position: 'bottom-right',
    }
  );
}
