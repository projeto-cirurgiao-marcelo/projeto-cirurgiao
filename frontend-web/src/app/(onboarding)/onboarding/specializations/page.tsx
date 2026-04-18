'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { profileService } from '@/lib/api/profile.service';
import { logger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Mesmas 18 especialidades do mobile (`mobile-app/app/(onboarding)/
 * specializations.tsx`). Hardcoded em ambos — nao vem de endpoint
 * hoje. Se um dia vier, mover pro backend e consumir em ambos.
 */
const SPECIALIZATIONS = [
  'Cirurgia Geral',
  'Ortopedia',
  'Neurologia',
  'Anestesiologia',
  'Oftalmologia',
  'Dermatologia',
  'Cardiologia',
  'Oncologia',
  'Odontologia Veterinária',
  'Emergência e Terapia Intensiva',
  'Diagnóstico por Imagem',
  'Medicina de Felinos',
  'Medicina de Equinos',
  'Animais Silvestres',
  'Reprodução Animal',
  'Nutrição Animal',
  'Patologia Clínica',
  'Fisioterapia e Reabilitação',
];

export default function OnboardingSpecializationsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [skipping, setSkipping] = useState(false);

  // Carrega selecao previa se o usuario ja tiver passado por aqui
  useEffect(() => {
    let mounted = true;
    profileService
      .getProfile()
      .then((p) => {
        if (!mounted) return;
        if (p.onboardingCompleted) {
          // Ja completou — nao deveria estar aqui. Redireciona pro destino.
          router.replace('/student/my-courses');
          return;
        }
        if (p.specializations?.length) setSelected(p.specializations);
      })
      .catch((err) => {
        logger.error('[Onboarding] falha ao carregar perfil:', err);
      })
      .finally(() => {
        if (mounted) setLoadingProfile(false);
      });
    return () => {
      mounted = false;
    };
  }, [router]);

  const toggle = (spec: string) => {
    setSelected((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec],
    );
  };

  const handleContinue = () => {
    // Persistencia final na proxima etapa (profile-info) — evita
    // salvar em partes e deixar state inconsistente.
    router.push(
      `/onboarding/profile-info?specs=${encodeURIComponent(JSON.stringify(selected))}`,
    );
  };

  const handleSkip = async () => {
    setSkipping(true);
    try {
      // Pular == marcar como completo sem dados. Consistente com mobile.
      await profileService.updateProfile({ specializations: [] });
      router.replace('/student/my-courses');
    } catch (err) {
      logger.error('[Onboarding] falha ao pular:', err);
      toast.error('Não foi possível pular agora. Tente novamente.');
      setSkipping(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">Etapa 1 de 2</div>
        <button
          type="button"
          onClick={handleSkip}
          disabled={skipping}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          Pular
        </button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Quais suas áreas de interesse?
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Selecione as especialidades que mais te interessam. Isso ajuda a
          personalizar sua experiência.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SPECIALIZATIONS.map((spec) => {
          const isActive = selected.includes(spec);
          return (
            <button
              key={spec}
              type="button"
              onClick={() => toggle(spec)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {spec}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 pt-6">
        <div className="text-sm text-gray-600">
          {selected.length} selecionada{selected.length === 1 ? '' : 's'}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected([])}
              className="ml-3 font-medium text-blue-600 hover:text-blue-800"
            >
              Limpar tudo
            </button>
          )}
        </div>
        <Button
          onClick={handleContinue}
          disabled={selected.length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
