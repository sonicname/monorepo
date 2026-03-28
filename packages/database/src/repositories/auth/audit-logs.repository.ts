import { desc, eq, lt } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as authSchema from '../../schema/auth/index.js';
import {
  auditLogsTable,
  type AuditLogRow,
  type NewAuditLogRow,
} from '../../schema/auth/index.js';

export function createAuditLogsRepository(
  db: PostgresJsDatabase<typeof authSchema>,
) {
  return {
    async create(data: NewAuditLogRow): Promise<AuditLogRow> {
      const rows = await db
        .insert(auditLogsTable)
        .values(data)
        .returning();

      return rows[0]!;
    },

    async findByUserId(
      userId: string,
      limit = 50,
    ): Promise<AuditLogRow[]> {
      return db
        .select()
        .from(auditLogsTable)
        .where(eq(auditLogsTable.userId, userId))
        .orderBy(desc(auditLogsTable.createdAt))
        .limit(limit);
    },

    async deleteOlderThan(days: number): Promise<void> {
      const cutoff = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000,
      ).toISOString();

      await db
        .delete(auditLogsTable)
        .where(lt(auditLogsTable.createdAt, cutoff));
    },
  };
}

export type AuditLogsRepository = ReturnType<typeof createAuditLogsRepository>;
