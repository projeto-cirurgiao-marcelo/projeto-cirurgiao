'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useBadges } from '@/hooks/useBadges';
import { BadgeGrid } from '@/components/gamification/BadgeGrid';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';

export default function BadgesPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const { badges, summary, isLoading } = useBadges();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/student/gamification')}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Conquistas
          </h1>
          <p className="text-sm text-gray-600">
            {summary
              ? `${summary.unlocked} de ${summary.total} conquistadas`
              : 'Carregando...'}
          </p>
        </div>
      </div>

      {/* Badge Grid */}
      <BadgeGrid badges={badges} summary={summary} />
    </div>
  );
}
