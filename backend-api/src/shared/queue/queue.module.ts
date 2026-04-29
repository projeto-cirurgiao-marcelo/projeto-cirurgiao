import { DynamicModule, Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from './queue.constants';
import { buildBullRootOptions } from './queue.config';
import { QueueService } from './queue.service';

/**
 * Wraps @nestjs/bullmq so the rest of the app never imports BullModule
 * directly. Controlled by the `QUEUE_ENABLED` feature flag:
 *
 * - `QUEUE_ENABLED=true`  → BullModule.forRootAsync + BullModule.registerQueue
 *                          for each named queue. QueueService enqueues
 *                          real BullMQ jobs.
 * - `QUEUE_ENABLED=false` (default) → BullModule is NOT registered at all.
 *   No Redis connection is attempted. QueueService goes into synchronous
 *   mode: `enqueue()` runs the caller's fallback inline.
 *
 * Reads process.env directly (not ConfigService) so the decision is made
 * at module-graph build time, before DI resolves.
 */
@Global()
@Module({})
export class QueueModule {
  private static readonly logger = new Logger(QueueModule.name);

  static forRoot(): DynamicModule {
    const queueEnabled =
      (process.env.QUEUE_ENABLED ?? 'false').toLowerCase() === 'true';

    if (!queueEnabled) {
      QueueModule.logger.log(
        'QUEUE_ENABLED=false — BullMQ skipped entirely. QueueService runs inline.',
      );
    }

    const bullImports = queueEnabled
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
              QueueModule.logger.log(
                'QUEUE_ENABLED=true — initialising BullMQ connection.',
              );
              return buildBullRootOptions(configService);
            },
          }),
          BullModule.registerQueue(
            { name: QUEUE_NAMES.SUMMARY },
            { name: QUEUE_NAMES.QUIZ },
            { name: QUEUE_NAMES.PDF_INGEST },
            { name: QUEUE_NAMES.CAPTIONS },
          ),
        ]
      : [];

    return {
      module: QueueModule,
      imports: [ConfigModule, ...bullImports],
      providers: [QueueService],
      exports: [QueueService, ...(queueEnabled ? [BullModule] : [])],
    };
  }
}
