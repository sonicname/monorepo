import { pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { usersTable } from './users.js';

export const tokenTypeEnum = pgEnum('token_type', [
  'email_verify',
  'password_reset',
]);

export const verificationTokensTable = pgTable('verification_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  type: tokenTypeEnum('type').notNull(),
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

export type VerificationTokenRow =
  typeof verificationTokensTable.$inferSelect;
export type NewVerificationTokenRow =
  typeof verificationTokensTable.$inferInsert;
