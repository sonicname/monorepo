import { and, desc, eq, gt, lt } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as authSchema from '../../schema/auth/index.js';
import {
  refreshTokensTable,
  type NewRefreshTokenRow,
  type RefreshTokenRow,
} from '../../schema/auth/index.js';

export function createRefreshTokensRepository(
  db: PostgresJsDatabase<typeof authSchema>,
) {
  return {
    async create(data: NewRefreshTokenRow): Promise<RefreshTokenRow> {
      const rows = await db
        .insert(refreshTokensTable)
        .values(data)
        .returning();

      return rows[0]!;
    },

    async findByTokenHash(
      tokenHash: string,
    ): Promise<RefreshTokenRow | undefined> {
      const rows = await db
        .select()
        .from(refreshTokensTable)
        .where(eq(refreshTokensTable.tokenHash, tokenHash))
        .limit(1);

      return rows[0];
    },

    async findActiveByUserId(userId: string): Promise<RefreshTokenRow[]> {
      return db
        .select()
        .from(refreshTokensTable)
        .where(
          and(
            eq(refreshTokensTable.userId, userId),
            eq(refreshTokensTable.revoked, false),
            gt(refreshTokensTable.expiresAt, new Date().toISOString()),
          ),
        )
        .orderBy(desc(refreshTokensTable.createdAt));
    },

    async revoke(id: string): Promise<void> {
      await db
        .update(refreshTokensTable)
        .set({ revoked: true })
        .where(eq(refreshTokensTable.id, id));
    },

    async revokeAllByUserId(userId: string): Promise<void> {
      await db
        .update(refreshTokensTable)
        .set({ revoked: true })
        .where(eq(refreshTokensTable.userId, userId));
    },

    async deleteExpired(): Promise<void> {
      await db
        .delete(refreshTokensTable)
        .where(
          and(
            eq(refreshTokensTable.revoked, true),
            lt(refreshTokensTable.expiresAt, new Date().toISOString()),
          ),
        );
    },
  };
}

export type RefreshTokensRepository = ReturnType<
  typeof createRefreshTokensRepository
>;
