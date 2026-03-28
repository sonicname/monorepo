import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type AuditAction =
  | 'register'
  | 'login'
  | 'login_failed'
  | 'refresh_token'
  | 'logout'
  | 'logout_all'
  | 'profile_update';

export interface AuditEntry {
  userId?: string;
  action: AuditAction;
  resource: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.databaseService.auditLogsRepository.create({
        id: crypto.randomUUID(),
        userId: entry.userId ?? null,
        action: entry.action,
        resource: entry.resource,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        metadata: {
          ...entry.metadata,
          ...(entry.requestId && { requestId: entry.requestId }),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
