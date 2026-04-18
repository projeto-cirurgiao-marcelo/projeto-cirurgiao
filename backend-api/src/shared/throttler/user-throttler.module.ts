/**
 * Exposes the UserThrottlerGuard so AI modules can @UseGuards(UserThrottlerGuard).
 *
 * The ThrottlerModule itself is configured globally in AppModule — this
 * module just re-provides the guard where needed. The 'ai-user' throttler
 * config (60s / AI_USER_THROTTLE_RPM) is declared in AppModule alongside
 * the existing 'short' and 'medium' IP throttlers, so both run for every
 * decorated request and the tighter of the two wins.
 */
import { Module } from '@nestjs/common';
import { UserThrottlerGuard } from './user-throttler.guard';

@Module({
  providers: [UserThrottlerGuard],
  exports: [UserThrottlerGuard],
})
export class UserThrottlerModule {}
