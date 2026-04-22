import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, AuditEntityType } from './audit.constants';

export interface RecordAuditEventParams {
  actorId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Thin writer on top of the `audit_logs` table. Used by services that
 * soft-delete or toggle privileges. Never throws — an audit-log failure
 * should not crash the parent operation; it logs locally and moves on.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(params: RecordAuditEventParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          metadata: (params.metadata ?? null) as any,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to record audit event ${params.action} for ${params.entityType}:${params.entityId}: ${(err as Error).message}`,
      );
    }
  }
}
