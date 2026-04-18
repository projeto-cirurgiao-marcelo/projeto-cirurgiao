import { DynamicModule, Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from './queue.constants';
import { buildBullRootOptions, isQueueEnabled } from './queue.config';
import { QueueService } from './queue.service';

/**
 * Wraps @nestjs/bullmq so the rest of the app never imports BullModule
 * directly. Controlled by the `QUEUE_ENABLED` feature flag:
 *
 * - `QUEUE_ENABLED=true`  → BullModule.forRootAsync + BullModule.registerQueue
 *                          for each named queue. QueueService enqueues
 *                          real BullMQ jobs.
 * - `QUEUE_ENABLED=false` (default) → BullModule is NOT registered.
 *   QueueService goes into synchronous mode: `enqueue()` runs the caller's
 *   fallback inline and returns the would-be job metadata, so callers
 *   still get a uniform 202-looking response without Redis.
 *
 * This lets the code ship to prod before Cloud Memorystore is provisioned
 * — when Gustav sets QUEUE_ENABLED=true and configures Redis, the queue
 * activates without another deploy.
 */
@Global()
@Module({})
export class QueueModule {
  private static readonly logger = new Logger(QueueModule.name);

  static forRoot(): DynamicModule {
    // We don't have ConfigService at the decorator level, so we build
    // the module graph conditionally inside an async factory.
    return {
      module: QueueModule,
      imports: [
        ConfigModule,
        // Register BullMQ only when the flag is on. If off, BullModule
        // never touches Redis — handy for local runs without docker up.
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            if (!isQueueEnabled(configService)) {
              QueueModule.logger.log(
                'QUEUE_ENABLED=false — BullMQ root config skipped (no-op mode).',
              );
              // Return a config pointing at a TCP port that will never be
              // reached. BullMQ lazy-connects only when someone enqueues,
              // and QueueService.enqueue() will short-circuit before that
              // when the flag is off.
              return {
                connection: { host: '127.0.0.1', port: 0 },
              };
            }
            QueueModule.logger.log('QUEUE_ENABLED=true — initialising BullMQ connection.');
            return buildBullRootOptions(configService);
          },
        }),
        BullModule.registerQueue(
          { name: QUEUE_NAMES.SUMMARY },
          { name: QUEUE_NAMES.QUIZ },
          { name: QUEUE_NAMES.PDF_INGEST },
          { name: QUEUE_NAMES.CAPTIONS },
        ),
      ],
      providers: [QueueService],
      exports: [QueueService, BullModule],
    };
  }
}
