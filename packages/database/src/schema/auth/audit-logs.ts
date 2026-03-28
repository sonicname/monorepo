import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { usersTable } from './users.js';

export const auditLogsTable = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => usersTable.id, {
    onDelete: 'set null',
  }),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  ip: text('ip'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', {
    mode: 'string',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export type AuditLogRow = typeof auditLogsTable.$inferSelect;
export type NewAuditLogRow = typeof auditLogsTable.$inferInsert;
