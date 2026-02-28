'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowUp, Trophy } from 'lucide-react';
import { useGamificationStore } from '@/lib/stores/gamification-store';
import { LEVELS } from '@/lib/gamification';

export function LevelUpModal() {
  const show = useGamificationStore((s) => s.showLevelUpModal);
  const data = useGamificationStore((s) => s.levelUpData);
  const dismiss = useGamificationStore((s) => s.dismissLevelUp);

  if (!data) return null;

  const levelInfo = LEVELS.find((l) => l.level === data.newLevel);
  const color = levelInfo?.color || data.newColor;
  const isMaxLevel = data.newLevel >= 10;

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
              {/* Background gradient */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${color}15, ${color}30, ${color}15)`,
                }}
              />
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/90 backdrop-blur-sm" />

              <div className="relative p-8 text-center">
                {/* Floating particles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    style={{
                      left: `${15 + Math.random() * 70}%`,
                      top: `${10 + Math.random() * 60}%`,
                    }}
                    animate={{
                      y: [0, -20, 0],
                      opacity: [0, 1, 0],
                      scale: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2 + Math.random(),
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: 'easeInOut',
                    }}
                  >
                    <Sparkles
                      className="h-4 w-4"
                      style={{ color }}
                    />
                  </motion.div>
                ))}

                {/* Arrow up icon */}
                <motion.div
                  className="flex justify-center mb-3"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <ArrowUp className="h-6 w-6 text-muted-foreground" />
                </motion.div>

                {/* Level number */}
                <motion.div
                  className="flex justify-center mb-4"
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
                    className="flex items-center justify-center h-24 w-24 rounded-full text-4xl font-black text-white shadow-xl"
                    style={{
                      background: isMaxLevel
                        ? `linear-gradient(135deg, ${color}, #F59E0B, ${color})`
                        : `linear-gradient(135deg, ${color}, ${color}cc)`,
                      boxShadow: `0 0 30px ${color}50`,
                    }}
                  >
                    {data.newLevel}
                  </div>
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">
                    Novo nível alcançado!
                  </p>
                  <h2
                    className="text-2xl font-black"
                    style={{ color }}
                  >
                    {data.newTitle}
                  </h2>
                </motion.div>

                {/* Trophy for max level */}
                {isMaxLevel && (
                  <motion.div
                    className="flex justify-center mt-3"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                  >
                    <Trophy className="h-8 w-8 text-amber-500" />
                  </motion.div>
                )}

                {/* Congratulations text */}
                <motion.p
                  className="text-sm text-muted-foreground mt-4 mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  {isMaxLevel
                    ? 'Você alcançou o nível máximo! Incrível!'
                    : 'Continue estudando para subir de nível!'}
                </motion.p>

                {/* Continue button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <Button
                    onClick={dismiss}
                    className="w-full h-11 font-semibold text-white shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                    }}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Continuar
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
