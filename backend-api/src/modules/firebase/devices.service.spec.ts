import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { DevicesService } from './devices.service';
import { PrismaService } from '../../shared/prisma/prisma.service';

describe('DevicesService', () => {
  let service: DevicesService;
  let prisma: DeepMockProxy<PrismaService>;

  const info = { deviceId: 'dev-1', name: 'iPhone', platform: 'ios' as const };

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const module = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: (k: string) => ({ MAX_ACTIVE_DEVICES: '2' })[k] } },
      ],
    }).compile();
    service = module.get(DevicesService);
  });

  it('fromHeaders: ignora sem X-Device-Id e normaliza plataforma desconhecida pra web', () => {
    expect(DevicesService.fromHeaders({})).toBeNull();
    expect(DevicesService.fromHeaders({ 'x-device-id': 'abc', 'x-device-platform': 'tv' })).toEqual({
      deviceId: 'abc',
      name: null,
      platform: 'web',
    });
  });

  it('touch: cria na primeira vez e não grava lastSeenAt de novo dentro de 5 min', async () => {
    prisma.userDevice.findUnique.mockResolvedValueOnce(null);
    prisma.userDevice.create.mockResolvedValue({ id: 'd1', revokedAt: null } as never);
    await service.touch('u1', info);
    expect(prisma.userDevice.create).toHaveBeenCalled();

    prisma.userDevice.findUnique.mockResolvedValueOnce({ id: 'd1', revokedAt: null, lastSeenAt: new Date() } as never);
    await service.touch('u1', info);
    expect(prisma.userDevice.update).not.toHaveBeenCalled();
  });

  it('touch: devolve o revogado sem reativar', async () => {
    const revoked = { id: 'd1', revokedAt: new Date(), lastSeenAt: new Date(0) };
    prisma.userDevice.findUnique.mockResolvedValueOnce(revoked as never);
    await expect(service.touch('u1', info)).resolves.toBe(revoked);
    expect(prisma.userDevice.update).not.toHaveBeenCalled();
  });

  it('register (STUDENT): acima do limite derruba os mais antigos', async () => {
    prisma.userDevice.upsert.mockResolvedValue({ id: 'new' } as never);
    prisma.userDevice.findMany.mockResolvedValue([{ id: 'new' }, { id: 'mid' }, { id: 'old' }] as never);
    prisma.userDevice.updateMany.mockResolvedValue({ count: 1 });

    await service.register('u1', Role.STUDENT, info);

    expect(prisma.userDevice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['old'] } } }),
    );
  });

  it('register (ADMIN): sem limite', async () => {
    prisma.userDevice.upsert.mockResolvedValue({ id: 'new' } as never);
    await service.register('u1', Role.ADMIN, info);
    expect(prisma.userDevice.findMany).not.toHaveBeenCalled();
  });

  it('list: marca o dispositivo atual', async () => {
    prisma.userDevice.findMany.mockResolvedValue([
      { id: 'a', deviceId: 'dev-1', name: 'iPhone', platform: 'ios' },
      { id: 'b', deviceId: 'dev-2', name: 'Chrome', platform: 'web' },
    ] as never);
    const rows = await service.list('u1', 'dev-2');
    expect(rows.map((r) => [r.id, r.current])).toEqual([
      ['a', false],
      ['b', true],
    ]);
    expect((rows[0] as Record<string, unknown>).deviceId).toBeUndefined();
  });

  it('revoke: 404 quando não é do usuário', async () => {
    prisma.userDevice.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.revoke('u1', 'x')).rejects.toThrow('Dispositivo não encontrado');
  });
});
