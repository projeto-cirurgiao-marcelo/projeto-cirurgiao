import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiExcludeController } from '@nestjs/swagger';

/**
 * Liveness/readiness probe para uptime monitoring (P1.13).
 * Resposta mínima, sem dados sensíveis. Fora do rate limit pra não
 * ser bloqueado por pings frequentes de monitor/load balancer.
 */
@ApiExcludeController()
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
