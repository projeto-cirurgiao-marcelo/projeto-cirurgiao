'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MonitorSmartphone, Smartphone, Monitor, LogOut } from 'lucide-react';
import {
  AtlasButton,
  AtlasCard,
  AtlasCardContent,
  AtlasCardHeader,
  AtlasCardTitle,
  atlasToast,
} from '@/components/atlas';
import { devicesService, type ConnectedDevice } from '@/lib/api/devices.service';
import { logger } from '@/lib/logger';

function relative(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 2) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}

/** Lista "Dispositivos conectados" do perfil do aluno, com botão de desconectar os outros. */
export function ConnectedDevicesCard() {
  const [devices, setDevices] = useState<ConnectedDevice[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDevices(await devicesService.list());
    } catch (e) {
      logger.error('[Devices] falha ao listar', e);
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (id: string) => {
    setBusyId(id);
    try {
      await devicesService.revoke(id);
      setDevices((list) => list?.filter((d) => d.id !== id) ?? null);
      atlasToast.success('Dispositivo desconectado');
    } catch (e) {
      logger.error('[Devices] falha ao desconectar', e);
      atlasToast.error('Não foi possível desconectar. Tente de novo.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AtlasCard>
      <AtlasCardHeader>
        <div className="flex items-center gap-2.5 min-w-0">
          <MonitorSmartphone className="size-4 text-atlas-muted shrink-0" strokeWidth={1.5} />
          <AtlasCardTitle>Dispositivos conectados</AtlasCardTitle>
        </div>
      </AtlasCardHeader>
      <AtlasCardContent className="space-y-3">
        <p className="text-[12.5px] text-atlas-muted -mt-1">
          Sua conta é pessoal e pode ficar conectada em até 3 aparelhos. Ao entrar num
          quarto, o mais antigo é desconectado.
        </p>
        {devices === null ? (
          <div className="flex items-center gap-2 text-sm text-atlas-muted">
            <Loader2 className="size-4 animate-spin" /> Carregando…
          </div>
        ) : devices.length === 0 ? (
          <p className="text-sm text-atlas-muted">Nenhum dispositivo registrado ainda.</p>
        ) : (
          <ul className="divide-y divide-atlas-border">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2.5">
                {d.platform === 'web' ? (
                  <Monitor className="size-4 text-atlas-muted shrink-0" strokeWidth={1.5} />
                ) : (
                  <Smartphone className="size-4 text-atlas-muted shrink-0" strokeWidth={1.5} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">
                    {d.name ?? (d.platform === 'web' ? 'Navegador' : d.platform === 'ios' ? 'iPhone' : 'Android')}
                    {d.current && <span className="ml-2 text-[11px] text-atlas-muted">este aparelho</span>}
                  </p>
                  <p className="text-[12px] text-atlas-muted">Último acesso {relative(d.lastSeenAt)}</p>
                </div>
                {!d.current && (
                  <AtlasButton
                    variant="outline"
                    size="sm"
                    disabled={busyId === d.id}
                    onClick={() => void revoke(d.id)}
                  >
                    {busyId === d.id ? <Loader2 className="size-4 animate-spin" /> : <LogOut strokeWidth={1.5} />}
                    Desconectar
                  </AtlasButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </AtlasCardContent>
    </AtlasCard>
  );
}
