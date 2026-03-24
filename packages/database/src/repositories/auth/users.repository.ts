import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as authSchema from '../../schema/auth/index.js';
import {
  usersTable,
  type NewUserRow,
  type UserRow,
} from '../../schema/auth/index.js';

export function createUsersRepository(
  db: PostgresJsDatabase<typeof authSchema>,
) {
  return {
    async findByEmail(email: string): Promise<UserRow | undefined> {
      const rows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      return rows[0];
    },

    async findByUsername(username: string): Promise<UserRow | undefined> {
      const rows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.username, username))
        .limit(1);

      return rows[0];
    },

    async findById(id: string): Promise<UserRow | undefined> {
      const rows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);

      return rows[0];
    },

    async create(data: NewUserRow): Promise<UserRow> {
      const rows = await db.insert(usersTable).values(data).returning();

      return rows[0]!;
    },
  };
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;
