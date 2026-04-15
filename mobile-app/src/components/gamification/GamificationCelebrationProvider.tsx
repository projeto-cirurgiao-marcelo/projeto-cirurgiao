import React from 'react';
import { XpPopup } from './XpPopup';
import { LevelUpModal } from './LevelUpModal';
import { BadgeUnlockModal } from './BadgeUnlockModal';

export function GamificationCelebrationProvider() {
  return (
    <>
      <XpPopup />
      <LevelUpModal />
      <BadgeUnlockModal />
    </>
  );
}
