import { and, eq, lt } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as authSchema from '../../schema/auth/index.js';
import {
  verificationTokensTable,
  type NewVerificationTokenRow,
  type VerificationTokenRow,
} from '../../schema/auth/index.js';

export function createVerificationTokensRepository(
  db: PostgresJsDatabase<typeof authSchema>,
) {
  return {
    async create(
      data: NewVerificationTokenRow,
    ): Promise<VerificationTokenRow> {
      const rows = await db
        .insert(verificationTokensTable)
        .values(data)
        .returning();

      return rows[0]!;
    },

    async findByTokenHash(
      tokenHash: string,
    ): Promise<VerificationTokenRow | undefined> {
      const rows = await db
        .select()
        .from(verificationTokensTable)
        .where(eq(verificationTokensTable.tokenHash, tokenHash))
        .limit(1);

      return rows[0];
    },

    async deleteById(id: string): Promise<void> {
      await db
        .delete(verificationTokensTable)
        .where(eq(verificationTokensTable.id, id));
    },

    async deleteByUserId(
      userId: string,
      type: 'email_verify' | 'password_reset',
    ): Promise<void> {
      await db
        .delete(verificationTokensTable)
        .where(
          and(
            eq(verificationTokensTable.userId, userId),
            eq(verificationTokensTable.type, type),
          ),
        );
    },

    async deleteExpired(): Promise<void> {
      await db
        .delete(verificationTokensTable)
        .where(lt(verificationTokensTable.expiresAt, new Date().toISOString()));
    },
  };
}

export type VerificationTokensRepository = ReturnType<
  typeof createVerificationTokensRepository
>;
