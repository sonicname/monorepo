import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { usersTable } from './users.js';

export const refreshTokensTable = pgTable('refresh_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  ip: text('ip'),
  userAgent: text('user_agent'),
  revoked: boolean('revoked').default(false).notNull(),
  expiresAt: timestamp('expires_at', {
    mode: 'string',
    withTimezone: true,
  }).notNull(),
  createdAt: timestamp('created_at', {
    mode: 'string',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export type RefreshTokenRow = typeof refreshTokensTable.$inferSelect;
export type NewRefreshTokenRow = typeof refreshTokensTable.$inferInsert;
