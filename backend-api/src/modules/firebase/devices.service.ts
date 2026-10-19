import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, UserDevice } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

export interface DeviceInfo {
  deviceId: string;
  name: string | null;
  platform: 'ios' | 'android' | 'web';
}

/** Headers que o app e a web mandam em toda requisição. */
export const DEVICE_HEADERS = {
  id: 'x-device-id',
  name: 'x-device-name',
  platform: 'x-device-platform',
} as const;

const PLATFORMS = new Set(['ios', 'android', 'web']);
/** `lastSeenAt` só é gravado de novo depois deste intervalo (evita 1 UPDATE por request). */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

function header(headers: Record<string, unknown>, name: string): string | null {
  const v = headers[name];
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' && s.trim() ? s.trim() : null;
}

/**
 * Dispositivos por conta (anti-compartilhamento, item 2 do plano de 19/10/2026).
 * Cada cliente gera um uuid e manda em `X-Device-Id`; o guard consulta aqui.
 * STUDENT tem no máximo MAX_ACTIVE_DEVICES ativos: ao passar, o mais antigo
 * (por lastSeenAt) é revogado e a próxima chamada dele devolve 401 DEVICE_REVOKED.
 */
@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);
  readonly maxActive: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.maxActive = Number(config.get<string>('MAX_ACTIVE_DEVICES')) || 3;
  }

  static fromHeaders(headers: Record<string, unknown>): DeviceInfo | null {
    const deviceId = header(headers, DEVICE_HEADERS.id);
    if (!deviceId || deviceId.length > 100) return null;
    const platform = header(headers, DEVICE_HEADERS.platform) ?? 'web';
    return {
      deviceId,
      name: header(headers, DEVICE_HEADERS.name)?.slice(0, 120) ?? null,
      platform: (PLATFORMS.has(platform) ? platform : 'web') as DeviceInfo['platform'],
    };
  }

  /**
   * Chamado pelo guard a cada request: devolve o registro (criando se for a
   * primeira vez) e atualiza lastSeenAt no máximo a cada 5 min. Não reativa
   * um dispositivo revogado — isso só o login faz.
   */
  async touch(userId: string, info: DeviceInfo): Promise<UserDevice> {
    const existing = await this.prisma.userDevice.findUnique({
      where: { userId_deviceId: { userId, deviceId: info.deviceId } },
    });
    if (!existing) {
      return this.prisma.userDevice.create({
        data: { userId, deviceId: info.deviceId, name: info.name, platform: info.platform },
      });
    }
    if (existing.revokedAt) return existing;
    if (Date.now() - existing.lastSeenAt.getTime() < TOUCH_INTERVAL_MS) return existing;
    return this.prisma.userDevice.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date(), name: info.name ?? existing.name },
    });
  }

  /**
   * Login: (re)ativa o dispositivo e aplica o limite — quem passa do teto é
   * o mais antigo por lastSeenAt. Admin/instrutor não tem limite.
   */
  async register(userId: string, role: Role | string, info: DeviceInfo): Promise<UserDevice> {
    const device = await this.prisma.userDevice.upsert({
      where: { userId_deviceId: { userId, deviceId: info.deviceId } },
      create: { userId, deviceId: info.deviceId, name: info.name, platform: info.platform },
      update: { lastSeenAt: new Date(), revokedAt: null, name: info.name ?? undefined, platform: info.platform },
    });
    if (role === Role.STUDENT) await this.enforceLimit(userId);
    return device;
  }

  async enforceLimit(userId: string): Promise<number> {
    const active = await this.prisma.userDevice.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastSeenAt: 'desc' },
      select: { id: true },
    });
    const excess = active.slice(this.maxActive).map((d) => d.id);
    if (excess.length === 0) return 0;
    await this.prisma.userDevice.updateMany({
      where: { id: { in: excess } },
      data: { revokedAt: new Date() },
    });
    this.logger.log(`user ${userId}: ${excess.length} dispositivo(s) derrubado(s) por limite (${this.maxActive})`);
    return excess.length;
  }

  list(userId: string, currentDeviceId: string | null) {
    return this.prisma.userDevice
      .findMany({
        where: { userId, revokedAt: null },
        orderBy: { lastSeenAt: 'desc' },
        select: { id: true, deviceId: true, name: true, platform: true, lastSeenAt: true, createdAt: true },
      })
      .then((rows) =>
        rows.map(({ deviceId, ...d }) => ({ ...d, current: deviceId === currentDeviceId })),
      );
  }

  async revoke(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.userDevice.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) throw new NotFoundException('Dispositivo não encontrado');
  }

  async revokeByDeviceId(userId: string, deviceId: string): Promise<void> {
    await this.prisma.userDevice.updateMany({
      where: { userId, deviceId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
