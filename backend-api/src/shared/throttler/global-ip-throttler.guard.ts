/**
 * Guard global de rate limit — aplica só os throttlers de IP ('short' 20/s
 * e 'medium' 100/min).
 *
 * O ThrottlerModule declara três throttlers no AppModule, mas o 'ai-user'
 * (30/min) é exclusivo dos controllers de AI via UserThrottlerGuard, com
 * chave por usuário. O ThrottlerGuard puro aplica TODOS os throttlers
 * declarados, o que capava silenciosamente a API inteira em 30 req/min por
 * IP (429 ao publicar aulas em série). Este subclasse filtra o 'ai-user'
 * pra fora — espelho do filtro inverso feito no UserThrottlerGuard.
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { USER_THROTTLE_TRACKER } from './user-throttler.guard';

@Injectable()
export class GlobalIpThrottlerGuard extends ThrottlerGuard implements OnModuleInit {
  async onModuleInit() {
    await super.onModuleInit();
    this.throttlers = this.throttlers.filter((t) => t.name !== USER_THROTTLE_TRACKER);
  }
}
