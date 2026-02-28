'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useGamificationStore } from '@/lib/stores/gamification-store';

export function XpPopup() {
  const xpPopupQueue = useGamificationStore((s) => s.xpPopupQueue);
  const dismissXpPopup = useGamificationStore((s) => s.dismissXpPopup);

  return (
    <div className="fixed top-20 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {xpPopupQueue.map((popup) => (
          <motion.div
            key={popup.id}
            layout
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="pointer-events-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-white shadow-lg shadow-amber-500/20 cursor-pointer"
            onClick={() => dismissXpPopup(popup.id)}
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Sparkles className="h-5 w-5" />
            </motion.div>
            <div>
              <motion.p
                className="text-base font-bold leading-tight"
                initial={{ scale: 0.5 }}
                animate={{ scale: [0.5, 1.3, 1] }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                +{popup.xp} XP
              </motion.p>
              <p className="text-xs text-white/80 leading-tight">
                {popup.description}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
