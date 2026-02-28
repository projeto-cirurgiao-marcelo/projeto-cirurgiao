'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Settings,
  Bell,
  Mail,
  Shield,
  Loader2,
  Save,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

// Chaves para localStorage
const STORAGE_KEY_PLATFORM = 'admin_platform_settings';
const STORAGE_KEY_NOTIFICATIONS = 'admin_notification_prefs';

interface PlatformSettings {
  platformName: string;
  platformDescription: string;
}

interface NotificationPrefs {
  emailNewStudent: boolean;
  emailNewEnrollment: boolean;
  emailForumReport: boolean;
  emailQuizCompletion: boolean;
}

const defaultPlatform: PlatformSettings = {
  platformName: 'Projeto Cirurgiao',
  platformDescription: 'Plataforma de cursos online voltada para cirurgia veterinaria.',
};

const defaultNotifications: NotificationPrefs = {
  emailNewStudent: true,
  emailNewEnrollment: true,
  emailForumReport: true,
  emailQuizCompletion: false,
};

export default function AdminSettingsPage() {
  const { user } = useAuthStore();

  // Estado do perfil
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');

  // Estado da plataforma (localStorage)
  const [platform, setPlatform] = useState<PlatformSettings>(defaultPlatform);
  const [savingPlatform, setSavingPlatform] = useState(false);

  // Estado das notificacoes (localStorage)
  const [notifications, setNotifications] = useState<NotificationPrefs>(defaultNotifications);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Carregar dados ao montar
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
    }

    // Carregar configuracoes do localStorage
    try {
      const savedPlatform = localStorage.getItem(STORAGE_KEY_PLATFORM);
      if (savedPlatform) setPlatform(JSON.parse(savedPlatform));

      const savedNotifications = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
    } catch {
      // Ignorar erros de parse
    }
  }, [user]);

  // Salvar configuracoes da plataforma
  const handleSavePlatform = () => {
    setSavingPlatform(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY_PLATFORM, JSON.stringify(platform));
      toast.success('Configuracoes da plataforma salvas');
      setSavingPlatform(false);
    }, 400);
  };

  // Salvar preferencias de notificacao
  const handleSaveNotifications = () => {
    setSavingNotifications(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications));
      toast.success('Preferencias de notificacao salvas');
      setSavingNotifications(false);
    }, 400);
  };

  // Iniciais do nome
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Configuracoes
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Gerencie seu perfil e configuracoes da plataforma.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="platform" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Plataforma</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificacoes</span>
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB: PERFIL ===== */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Perfil do Administrador</CardTitle>
              <CardDescription>
                Informacoes da sua conta de administrador.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar + Info */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-[rgb(var(--primary-500))] flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-white">
                    {getInitials(profileName || 'AD')}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {profileName}
                  </p>
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-[rgb(var(--primary-500))]" />
                    <span className="text-sm text-[rgb(var(--primary-500))] font-medium">
                      Administrador
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-200 dark:bg-gray-800" />

              {/* Campos do perfil */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Nome
                  </label>
                  <Input
                    value={profileName}
                    disabled
                    className="bg-gray-50 dark:bg-gray-800/50"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Gerenciado pelo sistema de autenticacao.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={profileEmail}
                      disabled
                      className="pl-10 bg-gray-50 dark:bg-gray-800/50"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Funcao
                  </label>
                  <Input
                    value={user?.role || 'ADMIN'}
                    disabled
                    className="bg-gray-50 dark:bg-gray-800/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Membro desde
                  </label>
                  <Input
                    value={
                      user?.createdAt
                        ? new Date(user.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })
                        : '--'
                    }
                    disabled
                    className="bg-gray-50 dark:bg-gray-800/50"
                  />
                </div>
              </div>

              {/* Info box */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Alteracao de dados
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    Para alterar nome, email ou senha, utilize as configuracoes do Firebase Authentication.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB: PLATAFORMA ===== */}
        <TabsContent value="platform">
          <Card>
            <CardHeader>
              <CardTitle>Configuracoes da Plataforma</CardTitle>
              <CardDescription>
                Preferencias gerais da plataforma de ensino.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nome da plataforma
                </label>
                <Input
                  value={platform.platformName}
                  onChange={(e) =>
                    setPlatform((prev) => ({ ...prev, platformName: e.target.value }))
                  }
                  placeholder="Nome da plataforma"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Descricao
                </label>
                <textarea
                  value={platform.platformDescription}
                  onChange={(e) =>
                    setPlatform((prev) => ({ ...prev, platformDescription: e.target.value }))
                  }
                  placeholder="Descricao breve da plataforma"
                  rows={3}
                  className="w-full rounded-md border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-all duration-200 outline-none hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:bg-gray-900 dark:border-gray-700 dark:text-white resize-none"
                />
              </div>

              {/* Info box */}
              <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <Info className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    Armazenamento local
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
                    Estas configuracoes sao salvas localmente no navegador. Um endpoint de configuracoes no backend sera implementado futuramente.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSavePlatform}
                  disabled={savingPlatform}
                  className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--primary-500))] text-white rounded-lg hover:bg-[rgb(var(--primary-600))] transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {savingPlatform ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB: NOTIFICACOES ===== */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de Notificacao</CardTitle>
              <CardDescription>
                Configure quais notificacoes deseja receber por email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  key: 'emailNewStudent' as const,
                  label: 'Novo aluno cadastrado',
                  description: 'Receber email quando um novo aluno se registrar na plataforma.',
                },
                {
                  key: 'emailNewEnrollment' as const,
                  label: 'Nova matricula',
                  description: 'Receber email quando um aluno se matricular em um curso.',
                },
                {
                  key: 'emailForumReport' as const,
                  label: 'Denuncia no forum',
                  description: 'Receber email quando um topico for denunciado.',
                },
                {
                  key: 'emailQuizCompletion' as const,
                  label: 'Quiz concluido',
                  description: 'Receber email quando um aluno concluir um quiz.',
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={notifications[item.key]}
                    onChange={(e) =>
                      setNotifications((prev) => ({
                        ...prev,
                        [item.key]: e.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[rgb(var(--primary-500))] focus:ring-[rgb(var(--primary-500))] cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </label>
              ))}

              {/* Info box */}
              <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800 mt-2">
                <Info className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    Em desenvolvimento
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
                    O sistema de notificacoes por email ainda nao esta implementado no backend. Estas preferencias serao usadas quando o sistema estiver pronto.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveNotifications}
                  disabled={savingNotifications}
                  className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--primary-500))] text-white rounded-lg hover:bg-[rgb(var(--primary-600))] transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {savingNotifications ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
