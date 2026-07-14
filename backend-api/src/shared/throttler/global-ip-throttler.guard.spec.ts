import { Reflector } from '@nestjs/core';
import { GlobalIpThrottlerGuard } from './global-ip-throttler.guard';
import { UserThrottlerGuard, USER_THROTTLE_TRACKER } from './user-throttler.guard';

// Regressão do 429 global: o guard global NÃO pode aplicar o 'ai-user'
// (30/min), e o guard de AI NÃO pode reaplicar os caps de IP.
const options = {
  throttlers: [
    { name: 'short', ttl: 1000, limit: 20 },
    { name: 'medium', ttl: 60_000, limit: 100 },
    { name: USER_THROTTLE_TRACKER, ttl: 60_000, limit: 30 },
  ],
} as any;

const names = (guard: object) =>
  (guard as { throttlers: Array<{ name: string }> }).throttlers.map((t) => t.name);

describe('throttler guards', () => {
  it('guard global aplica só os throttlers de IP (short/medium)', async () => {
    const guard = new GlobalIpThrottlerGuard(options, {} as any, new Reflector());
    await guard.onModuleInit();
    expect(names(guard)).toEqual(['short', 'medium']);
  });

  it('guard de AI aplica só o ai-user', async () => {
    const guard = new UserThrottlerGuard(options, {} as any, new Reflector());
    await guard.onModuleInit();
    expect(names(guard)).toEqual([USER_THROTTLE_TRACKER]);
  });
});
