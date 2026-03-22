'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useAvatarStore } from '@/lib/stores/avatar-store';
import { profileService, UserProfile, UpdateProfileDto } from '@/lib/api/profile.service';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Camera, User, Mail, Briefcase, MapPin, Lock, Save, Eye, EyeOff, Shield, Calendar,
} from 'lucide-react';

export default function StudentProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setGlobalPhotoUrl = useAvatarStore((s) => s.setPhotoUrl);
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [specializations, setSpecializations] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    loadProfile();
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
      toast({ title: 'Erro', description: 'Não foi possível carregar o perfil.', variant: 'destructive' });
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
          .map(s => s.trim())
          .filter(Boolean),
      };
      const updated = await profileService.updateProfile(dto);
      setProfile(updated);
      toast({ title: 'Sucesso', description: 'Perfil atualizado!' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar o perfil.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Selecione um arquivo de imagem.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'Imagem deve ter no máximo 5MB.', variant: 'destructive' });
      return;
    }

    try {
      setUploadingPhoto(true);
      const { url } = await profileService.uploadPhoto(file);
      setProfile(prev => prev ? { ...prev, photoUrl: url } : prev);
      setGlobalPhotoUrl(url);
      toast({ title: 'Sucesso', description: 'Foto atualizada!' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível enviar a foto.', variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: 'Erro', description: 'Preencha todos os campos de senha.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Erro', description: 'A nova senha deve ter no mínimo 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
      return;
    }

    try {
      setChangingPassword(true);
      await profileService.changePassword({ currentPassword, newPassword });
      toast({ title: 'Sucesso', description: 'Senha alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Não foi possível alterar a senha.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  const getInitials = (n: string) => {
    return n.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="container mx-auto py-6 px-4 max-w-3xl space-y-6">
      {/* Header com foto */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <div
                className="w-28 h-28 rounded-full overflow-hidden border-4 border-gray-200 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white">{getInitials(profile.name)}</span>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploadingPhoto ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">Clique para alterar</p>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
              <p className="text-gray-500 flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                <Mail className="h-4 w-4" />
                {profile.email}
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {profile.role === 'STUDENT' ? 'Estudante' : profile.role === 'INSTRUCTOR' ? 'Instrutor' : 'Admin'}
                </Badge>
                {profile.profession && (
                  <Badge variant="secondary" className="text-xs">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {profile.profession}
                  </Badge>
                )}
              </div>
              {profile.createdAt && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center sm:justify-start gap-1">
                  <Calendar className="h-3 w-3" />
                  Membro desde {formatDate(profile.createdAt)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Pessoais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-blue-600" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>Atualize seu nome, profissão e localização</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome de Exibição</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Profissão</label>
              <Input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="Ex: Médico Veterinário" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Conte um pouco sobre você..." rows={3} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Estado
              </label>
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Ex: SP" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cidade</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: São Paulo" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Especializações</label>
            <Input
              value={specializations}
              onChange={(e) => setSpecializations(e.target.value)}
              placeholder="Ex: Cirurgia, Ortopedia, Cardiologia (separadas por vírgula)"
            />
            <p className="text-xs text-muted-foreground">Separe cada especialização por vírgula</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alterar Senha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-blue-600" />
            Segurança
          </CardTitle>
          <CardDescription>Altere sua senha de acesso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Senha Atual</label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova Senha</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar Nova Senha</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>
          </div>

          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-sm text-red-500">As senhas não coincidem</p>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
              variant="outline"
            >
              {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
              Alterar Senha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
