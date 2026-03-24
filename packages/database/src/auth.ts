import type { RuntimeEnv } from '@monorepo/config';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getAuthDatabaseConfig } from './config.js';
import * as authSchema from './schema/auth/index.js';

export * from './repositories/auth/index.js';
export * from './schema/auth/index.js';

export type DatabaseClient = ReturnType<typeof postgres>;
export type AuthDatabase = PostgresJsDatabase<typeof authSchema>;
export type AuthDatabaseInstance = {
  client: DatabaseClient;
  db: AuthDatabase;
};

export function createAuthDatabase(env: RuntimeEnv): AuthDatabaseInstance {
  const { connectionString } = getAuthDatabaseConfig(env);
  const client = postgres(connectionString, { prepare: false });

  return {
    client,
    db: drizzle(client, { schema: authSchema }),
  };
}

export async function closeAuthDatabase(
  instance: AuthDatabaseInstance,
): Promise<void> {
  await instance.client.end();
}
