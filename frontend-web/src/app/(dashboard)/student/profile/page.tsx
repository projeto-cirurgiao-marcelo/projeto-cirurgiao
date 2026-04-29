'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useAvatarStore } from '@/lib/stores/avatar-store';
import {
  profileService,
  UserProfile,
  UpdateProfileDto,
} from '@/lib/api/profile.service';
import {
  AtlasButton,
  AtlasCard,
  AtlasCardContent,
  AtlasCardHeader,
  AtlasCardTitle,
  AtlasLoadingBar,
  AtlasPageHeader,
  atlasToast,
} from '@/components/atlas';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Camera,
  User,
  Mail,
  Briefcase,
  MapPin,
  Lock,
  Save,
  Eye,
  EyeOff,
  Shield,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StudentProfilePage() {
  const setGlobalPhotoUrl = useAvatarStore((s) => s.setPhotoUrl);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [specializations, setSpecializations] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileService.getProfile();
      setProfile(data);
      setName(data.name || '');
      setProfession(data.profession || '');
      setBio(data.bio || '');
      setState(data.state || '');
      setCity(data.city || '');
      setSpecializations((data.specializations || []).join(', '));
      setGlobalPhotoUrl(data.photoUrl);
    } catch (error) {
      atlasToast.error('Falha ao carregar perfil', {
        description: 'Tente recarregar a página.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const dto: UpdateProfileDto = {
        name: name.trim() || undefined,
        profession: profession.trim() || undefined,
        bio: bio.trim() || undefined,
        state: state.trim() || undefined,
        city: city.trim() || undefined,
        specializations: specializations
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const updated = await profileService.updateProfile(dto);
      setProfile(updated);
      // Sem toast — campos persistem com valores atualizados, é feedback inline (nível 0)
    } catch (error) {
      atlasToast.error('Falha ao salvar perfil', {
        description: 'Verifique sua conexão e tente novamente.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      atlasToast.warning('Arquivo inválido', {
        description: 'Selecione uma imagem.',
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      atlasToast.warning('Imagem muito grande', {
        description: 'Máximo 5MB.',
      });
      return;
    }

    try {
      setUploadingPhoto(true);
      const { url } = await profileService.uploadPhoto(file);
      setProfile((prev) => (prev ? { ...prev, photoUrl: url } : prev));
      setGlobalPhotoUrl(url);
      // Sem toast — avatar atualiza imediato (feedback inline)
    } catch (error) {
      atlasToast.error('Falha ao enviar foto');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      atlasToast.warning('Preencha todos os campos de senha');
      return;
    }
    if (newPassword.length < 6) {
      atlasToast.warning('Senha muito curta', {
        description: 'Use ao menos 6 caracteres.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      atlasToast.warning('As senhas não coincidem');
      return;
    }

    try {
      setChangingPassword(true);
      await profileService.changePassword({ currentPassword, newPassword });
      atlasToast.success('Senha alterada com sucesso');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? 'Não foi possível alterar a senha.';
      atlasToast.error('Falha ao alterar senha', { description: message });
    } finally {
      setChangingPassword(false);
    }
  };

  const getInitials = (n: string) => {
    return n.split(' ').map((p) => p[0]).join('').substring(0, 2).toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-atlas-bg px-5 sm:px-7 py-7">
        <AtlasLoadingBar className="mb-[18px]" />
      </main>
    );
  }

  if (!profile) return null;

  const passwordsMatch =
    !newPassword || !confirmPassword || newPassword === confirmPassword;
  const roleLabel =
    profile.role === 'STUDENT'
      ? 'Estudante'
      : profile.role === 'INSTRUCTOR'
        ? 'Instrutor'
        : 'Administrador';

  return (
    <>
      <AtlasPageHeader
        metaLabel="Conta · Perfil"
        title="Meu perfil"
      />

      <div className="px-5 sm:px-7 py-5 sm:py-6 max-w-3xl mx-auto space-y-5 sm:space-y-6">
        {/* Header com avatar + identidade */}
        <AtlasCard>
          <AtlasCardContent className="px-5 py-5 sm:py-6">
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
              {/* Avatar */}
              <div className="relative group shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border border-atlas-line bg-atlas-primary flex items-center justify-center cursor-pointer"
                  aria-label="Alterar foto"
                >
                  {profile.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.photoUrl}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                      {getInitials(profile.name)}
                    </span>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {uploadingPhoto ? (
                      <Loader2 className="size-5 text-white animate-spin" />
                    ) : (
                      <Camera className="size-5 text-white" strokeWidth={1.75} />
                    )}
                  </div>
                </button>
                <p className="atlas-mono text-[10.5px] text-atlas-muted-2 text-center mt-2 tracking-[0.04em] uppercase">
                  Alterar foto
                </p>
              </div>

              {/* Identidade */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <h2 className="font-serif text-[22px] font-medium tracking-[-0.01em] text-atlas-ink truncate">
                  {profile.name}
                </h2>
                <div className="text-[13px] text-atlas-muted flex items-center justify-center sm:justify-start gap-1.5 mt-1.5">
                  <Mail className="size-3.5" strokeWidth={1.75} />
                  <span className="truncate">{profile.email}</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
                  <span className="atlas-caps text-atlas-muted bg-atlas-surface-2 border border-atlas-line px-2 py-0.5 rounded-sm">
                    {roleLabel}
                  </span>
                  {profile.profession && (
                    <span className="atlas-caps text-atlas-primary-2 bg-atlas-primary-soft border border-atlas-primary/30 px-2 py-0.5 rounded-sm inline-flex items-center gap-1">
                      <Briefcase className="size-2.5" strokeWidth={1.75} />
                      {profile.profession}
                    </span>
                  )}
                </div>
                {profile.createdAt && (
                  <div className="atlas-mono text-[10.5px] text-atlas-muted-2 mt-2 flex items-center justify-center sm:justify-start gap-1.5">
                    <Calendar className="size-3" strokeWidth={1.75} />
                    Membro desde {formatDate(profile.createdAt)}
                  </div>
                )}
              </div>
            </div>
          </AtlasCardContent>
        </AtlasCard>

        {/* Informações Pessoais */}
        <AtlasCard>
          <AtlasCardHeader>
            <div className="flex items-center gap-2.5 min-w-0">
              <User
                className="size-4 text-atlas-muted shrink-0"
                strokeWidth={1.5}
              />
              <AtlasCardTitle>Informações pessoais</AtlasCardTitle>
            </div>
          </AtlasCardHeader>
          <AtlasCardContent className="space-y-4">
            <p className="text-[12.5px] text-atlas-muted -mt-1">
              Atualize seu nome, profissão e localização.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldLabel label="Nome de exibição">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="border-atlas-line focus-visible:border-atlas-ink-2"
                />
              </FieldLabel>
              <FieldLabel label="Profissão">
                <Input
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="Ex: Médico Veterinário"
                  className="border-atlas-line focus-visible:border-atlas-ink-2"
                />
              </FieldLabel>
            </div>

            <FieldLabel label="Bio">
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Conte um pouco sobre você..."
                rows={3}
                className="border-atlas-line focus-visible:border-atlas-ink-2 resize-none"
              />
            </FieldLabel>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldLabel
                label="Estado"
                icon={MapPin}
              >
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Ex: SP"
                  className="border-atlas-line focus-visible:border-atlas-ink-2"
                />
              </FieldLabel>
              <FieldLabel label="Cidade">
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: São Paulo"
                  className="border-atlas-line focus-visible:border-atlas-ink-2"
                />
              </FieldLabel>
            </div>

            <FieldLabel label="Especializações" hint="Separe cada item por vírgula.">
              <Input
                value={specializations}
                onChange={(e) => setSpecializations(e.target.value)}
                placeholder="Ex: Cirurgia, Ortopedia, Cardiologia"
                className="border-atlas-line focus-visible:border-atlas-ink-2"
              />
            </FieldLabel>

            <div className="flex justify-end pt-2">
              <AtlasButton
                variant="primary"
                size="md"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save strokeWidth={1.5} />
                )}
                Salvar alterações
              </AtlasButton>
            </div>
          </AtlasCardContent>
        </AtlasCard>

        {/* Segurança */}
        <AtlasCard>
          <AtlasCardHeader>
            <div className="flex items-center gap-2.5 min-w-0">
              <Shield
                className="size-4 text-atlas-muted shrink-0"
                strokeWidth={1.5}
              />
              <AtlasCardTitle>Segurança</AtlasCardTitle>
            </div>
          </AtlasCardHeader>
          <AtlasCardContent className="space-y-4">
            <p className="text-[12.5px] text-atlas-muted -mt-1">
              Altere sua senha de acesso.
            </p>

            <FieldLabel label="Senha atual">
              <PasswordInput
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrentPassword}
                onToggleShow={() => setShowCurrentPassword((v) => !v)}
                placeholder="Digite sua senha atual"
              />
            </FieldLabel>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldLabel label="Nova senha">
                <PasswordInput
                  value={newPassword}
                  onChange={setNewPassword}
                  show={showNewPassword}
                  onToggleShow={() => setShowNewPassword((v) => !v)}
                  placeholder="Mínimo 6 caracteres"
                />
              </FieldLabel>
              <FieldLabel label="Confirmar nova senha">
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="border-atlas-line focus-visible:border-atlas-ink-2"
                />
              </FieldLabel>
            </div>

            {!passwordsMatch && (
              <div className="text-[12.5px] text-atlas-accent">
                As senhas não coincidem.
              </div>
            )}

            <div className="flex justify-end pt-2">
              <AtlasButton
                variant="outline"
                size="md"
                onClick={handleChangePassword}
                disabled={
                  changingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  newPassword !== confirmPassword
                }
              >
                {changingPassword ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Lock strokeWidth={1.5} />
                )}
                Alterar senha
              </AtlasButton>
            </div>
          </AtlasCardContent>
        </AtlasCard>
      </div>
    </>
  );
}

function FieldLabel({
  label,
  icon: Icon,
  hint,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-atlas-ink-2 flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5" strokeWidth={1.75} />}
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[11.5px] text-atlas-muted-2">{hint}</p>
      )}
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-atlas-line focus-visible:border-atlas-ink-2 pr-10"
      />
      <button
        type="button"
        onClick={onToggleShow}
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        className={cn(
          'absolute right-2.5 top-1/2 -translate-y-1/2',
          'text-atlas-muted hover:text-atlas-ink transition-colors',
        )}
      >
        {show ? (
          <EyeOff className="size-4" strokeWidth={1.75} />
        ) : (
          <Eye className="size-4" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}
