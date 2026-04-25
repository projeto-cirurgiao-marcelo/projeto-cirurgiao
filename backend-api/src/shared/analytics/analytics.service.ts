import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PostHog } from 'posthog-node';
import { AnalyticsEventName, AnalyticsEventProps } from './analytics.events';

@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private client: PostHog | null = null;
  private readonly enabled: boolean;

  constructor() {
    this.enabled = process.env.ANALYTICS_ENABLED === 'true';
    const apiKey = process.env.POSTHOG_API_KEY;
    const host = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';

    if (this.enabled && apiKey) {
      this.client = new PostHog(apiKey, { host, flushAt: 20, flushInterval: 10_000 });
      this.logger.log('Analytics enabled (PostHog)');
    } else if (this.enabled && !apiKey) {
      this.logger.warn('ANALYTICS_ENABLED=true but POSTHOG_API_KEY missing — events become no-op');
    } else {
      this.logger.log('Analytics disabled — events become no-op');
    }
  }

  capture<E extends AnalyticsEventName>(
    userId: string,
    event: E,
    properties: AnalyticsEventProps[E],
  ): void {
    if (!this.client) return;
    try {
      this.client.capture({ distinctId: userId, event, properties });
    } catch (err) {
      this.logger.error(`Failed to capture ${event}: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.shutdown();
    }
  }
}
