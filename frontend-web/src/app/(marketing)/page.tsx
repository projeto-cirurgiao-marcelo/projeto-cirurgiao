import type { Metadata } from 'next';
import { LandingHeader } from '@/components/landing/Header';
import { LandingHero } from '@/components/landing/Hero';
import { LandingAbout } from '@/components/landing/About';
import { LandingPillars } from '@/components/landing/Pillars';
import { LandingStatsStrip } from '@/components/landing/StatsStrip';
import { LandingTracks } from '@/components/landing/Tracks';
import { LandingReviews } from '@/components/landing/Reviews';
import { LandingFAQ } from '@/components/landing/FAQ';
import { LandingContact } from '@/components/landing/Contact';
import { LandingFooter } from '@/components/landing/Footer';
import { LandingFAB } from '@/components/landing/FAB';

export const metadata: Metadata = {
  title: 'Projeto Cirurgião — Mentoria & formação cirúrgica veterinária',
  description:
    'Mentoria, comunidade e treinamento prático para residentes e cirurgiões veterinários. Método validado, evolução visível em meses.',
};

export default function LandingPage() {
  return (
    <>
      <div className="pc-page-frame">
        <div className="pc-page">
          <LandingHeader />
          <LandingHero />
          <LandingAbout />
          <LandingPillars />
          <LandingStatsStrip />
          <LandingTracks />
          <LandingReviews />
          <LandingFAQ />
          <LandingContact />
        </div>
        <LandingFooter />
      </div>
      <LandingFAB />
    </>
  );
}
