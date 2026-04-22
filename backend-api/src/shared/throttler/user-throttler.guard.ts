/**
 * Per-user throttler guard for AI endpoints.
 *
 * The global ThrottlerGuard registered in AppModule already enforces
 * 'short' (20 rps) and 'medium' (100 rpm) caps, keyed by IP — that guards
 * against abusive bots. For AI endpoints (which hit Vertex and cost real
 * money) we additionally want a per-user cap so one authenticated user
 * cannot exhaust the budget from multiple devices/sessions.
 *
 * This guard is used via `@UseGuards(UserThrottlerGuard)` on AI controllers.
 * It:
 *   - Processes **only** the 'ai-user' throttler (filters the others out),
 *     so we do not double-count with the global guard.
 *   - Keys requests by `req.user.sub` / `req.user.id` when present,
 *     falling back to the remote IP for anonymous routes.
 *   - Sets the standard `X-RateLimit-*` + `Retry-After` headers via the
 *     parent Throttler machinery.
 *
 * Limit is configurable via `AI_USER_THROTTLE_RPM`; default is 30 rpm.
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

export const USER_THROTTLE_TRACKER = 'ai-user';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard implements OnModuleInit {
  async onModuleInit() {
    await super.onModuleInit();
    // Keep only the per-user throttler; drop 'short' / 'medium' so we do not
    // re-enforce the IP caps already applied by the global guard.
    this.throttlers = this.throttlers.filter((t) => t.name === USER_THROTTLE_TRACKER);
  }

  /**
   * Key requests by authenticated user id when available, falling back to
   * the remote IP. `req.user.sub` is populated by JwtStrategy; some Firebase
   * guards attach `req.user.id` instead — accept both.
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const user = req?.user as { sub?: string; id?: string } | undefined;
    const userId = user?.sub ?? user?.id;
    if (userId) {
      return `${USER_THROTTLE_TRACKER}:user:${userId}`;
    }
    return `${USER_THROTTLE_TRACKER}:ip:${req?.ip ?? req?.socket?.remoteAddress ?? 'unknown'}`;
  }
}
