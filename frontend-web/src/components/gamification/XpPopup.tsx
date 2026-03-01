'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useGamificationStore } from '@/lib/stores/gamification-store';

export function XpPopup() {
  const xpPopupQueue = useGamificationStore((s) => s.xpPopupQueue);
  const dismissXpPopup = useGamificationStore((s) => s.dismissXpPopup);

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {xpPopupQueue.map((popup) => (
          <motion.div
            key={popup.id}
            initial={{ opacity: 0, x: 80, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="pointer-events-auto"
          >
            <div
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-2.5 shadow-lg shadow-amber-200/50 cursor-pointer"
              onClick={() => dismissXpPopup(popup.id)}
            >
              <Sparkles className="h-4 w-4 text-white" />
              <span className="text-sm font-bold text-white">
                +{popup.xp} XP
              </span>
              <span className="text-xs text-white/80 max-w-[160px] truncate">
                {popup.description}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
