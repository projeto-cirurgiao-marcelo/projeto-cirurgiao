'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useGamificationStore } from '@/lib/stores/gamification-store';
import { RARITY_COLORS, RARITY_LABELS } from '@/lib/gamification';
import * as LucideIcons from 'lucide-react';

function DynamicIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const icons = LucideIcons as unknown as Record<string, React.ElementType>;
  const Icon = icons[name] || LucideIcons.Award;
  return <Icon className={className} style={style} />;
}

export function BadgeUnlockModal() {
  const show = useGamificationStore((s) => s.showBadgeUnlockModal);
  const badge = useGamificationStore((s) => s.badgeUnlockData);
  const dismiss = useGamificationStore((s) => s.dismissBadgeUnlock);

  if (!badge) return null;

  const colors = RARITY_COLORS[badge.rarity];
  const rarityLabel = RARITY_LABELS[badge.rarity];
  const isLegendary = badge.rarity === 'legendary';
  const isEpic = badge.rarity === 'epic';

  return (
    <Dialog open={show} onOpenChange={dismiss}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0 bg-transparent shadow-none [&>button]:hidden">
        <AnimatePresence>
          {show && (
            <motion.div
              className="relative rounded-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -30 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              {/* Background */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${colors.border}10, ${colors.border}25, ${colors.border}10)`,
                }}
              />
              <div className="absolute inset-0 bg-white/85 dark:bg-gray-900/90 backdrop-blur-sm" />

              <div className="relative p-8 text-center">
                {/* Floating sparkles for epic/legendary */}
                {(isLegendary || isEpic) &&
                  [...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      style={{
                        left: `${10 + Math.random() * 80}%`,
                        top: `${5 + Math.random() * 70}%`,
                      }}
                      animate={{
                        y: [0, -15, 0],
                        opacity: [0, 0.8, 0],
                        scale: [0.3, 1, 0.3],
                      }}
                      transition={{
                        duration: 1.5 + Math.random(),
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: 'easeInOut',
                      }}
                    >
                      <Sparkles
                        className="h-3 w-3"
                        style={{ color: colors.border }}
                      />
                    </motion.div>
                  ))}

                {/* Rarity label */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-4"
                >
                  <span
                    className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}40`,
                    }}
                  >
                    {rarityLabel}
                  </span>
                </motion.div>

                {/* Badge icon */}
                <motion.div
                  className="flex justify-center mb-5"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 150,
                    damping: 12,
                    delay: 0.3,
                  }}
                >
                  <div
                    className="relative flex items-center justify-center h-24 w-24 rounded-full shadow-xl"
                    style={{
                      background: `linear-gradient(135deg, ${colors.bg}, white)`,
                      border: `3px solid ${colors.border}`,
                      boxShadow: `0 0 30px ${colors.glow}`,
                    }}
                  >
                    <DynamicIcon
                      name={badge.icon}
                      className="h-12 w-12"
                      style={{ color: colors.text }}
                    />

                    {/* Glow ring for legendary */}
                    {isLegendary && (
                      <motion.div
                        className="absolute inset-[-4px] rounded-full"
                        style={{
                          border: `2px solid ${colors.border}`,
                          opacity: 0.5,
                        }}
                        animate={{
                          scale: [1, 1.15, 1],
                          opacity: [0.5, 0.2, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                    )}
                  </div>
                </motion.div>

                {/* Badge name */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">
                    Conquista desbloqueada!
                  </p>
                  <h2
                    className="text-2xl font-black"
                    style={{ color: colors.text }}
                  >
                    {badge.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    {badge.description}
                  </p>
                </motion.div>

                {/* Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="mt-6"
                >
                  <Button
                    onClick={dismiss}
                    className="w-full h-11 font-semibold text-white shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${colors.border}, ${colors.text})`,
                    }}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Incrível!
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
