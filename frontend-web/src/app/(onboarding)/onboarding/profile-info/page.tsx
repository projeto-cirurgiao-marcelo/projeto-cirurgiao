'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { profileService } from '@/lib/api/profile.service';
import { logger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Mesmas listas do mobile (mobile-app/app/(onboarding)/profile-info.tsx).
const PROFESSIONS = [
  'Estudante de Veterinária',
  'Médico(a) Veterinário(a)',
  'Residente',
  'Pós-Graduando(a)',
  'Professor(a)',
  'Outro',
];

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function ProfileInfoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Specializations vem como query param da etapa anterior
  // (evita depender de store so pra onboarding).
  const specsFromQuery = searchParams.get('specs');
  const specializations: string[] = (() => {
    if (!specsFromQuery) return [];
    try {
      return JSON.parse(decodeURIComponent(specsFromQuery)) as string[];
    } catch {
      return [];
    }
  })();

  const [profession, setProfession] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [showStates, setShowStates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Pre-preenche se o usuario ja tiver passado aqui antes
  useEffect(() => {
    let mounted = true;
    profileService
      .getProfile()
      .then((p) => {
        if (!mounted) return;
        if (p.onboardingCompleted) {
          router.replace('/student/my-courses');
          return;
        }
        if (p.profession) setProfession(p.profession);
        if (p.state) setState(p.state);
        if (p.city) setCity(p.city);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileService.updateProfile({
        profession: profession || undefined,
        state: state || undefined,
        city: city || undefined,
        specializations,
      });
      toast.success('Perfil salvo!', {
        description: 'Bem-vindo(a) ao Projeto Cirurgião.',
      });
      router.replace('/student/my-courses');
    } catch (err) {
      logger.error('[Onboarding] falha ao salvar perfil:', err);
      toast.error('Erro ao salvar perfil', {
        description: 'Tente novamente em alguns instantes.',
      });
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await profileService.updateProfile({ specializations });
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
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-gray-600 hover:text-gray-800"
        >
          Voltar
        </button>
        <div className="text-sm text-gray-500">Etapa 2 de 2</div>
        <button
          type="button"
          onClick={handleSkip}
          disabled={skipping || saving}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          Pular
        </button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Conte-nos sobre você</h1>
        <p className="mt-2 text-sm text-gray-600">
          Essas informações ajudam a personalizar sua experiência.
        </p>
      </div>

      {/* Profissao */}
      <div>
        <Label className="text-base font-semibold text-gray-900">
          Profissão / Formação
        </Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {PROFESSIONS.map((prof) => {
            const isActive = profession === prof;
            return (
              <button
                key={prof}
                type="button"
                onClick={() => setProfession(prof)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {prof}
              </button>
            );
          })}
        </div>
      </div>

      {/* Estado */}
      <div>
        <Label className="text-base font-semibold text-gray-900">Estado</Label>
        <button
          type="button"
          onClick={() => setShowStates((v) => !v)}
          className="mt-3 flex h-12 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-left text-sm text-gray-700"
        >
          <span className={state ? '' : 'text-gray-400'}>
            {state || 'Selecione seu estado'}
          </span>
          <span>{showStates ? '▲' : '▼'}</span>
        </button>
        {showStates && (
          <div className="mt-3 flex flex-wrap gap-2">
            {BRAZILIAN_STATES.map((uf) => {
              const isActive = state === uf;
              return (
                <button
                  key={uf}
                  type="button"
                  onClick={() => {
                    setState(uf);
                    setShowStates(false);
                  }}
                  className={`min-w-[48px] rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {uf}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cidade */}
      <div>
        <Label htmlFor="city" className="text-base font-semibold text-gray-900">
          Cidade
        </Label>
        <Input
          id="city"
          type="text"
          placeholder="Digite sua cidade"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-3 h-12"
          autoCapitalize="words"
        />
      </div>

      <div className="flex items-center justify-end border-t border-gray-200 pt-6">
        <Button
          onClick={handleSave}
          disabled={saving || skipping}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Concluir'
          )}
        </Button>
      </div>
    </div>
  );
}

export default function OnboardingProfileInfoPage() {
  // useSearchParams precisa de Suspense boundary no Next 15 App Router.
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      }
    >
      <ProfileInfoForm />
    </Suspense>
  );
}
