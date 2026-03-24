import type { RuntimeEnv } from '@monorepo/config';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getApiDatabaseConfig } from './config.js';
import * as apiSchema from './schema/api/index.js';

export * from './repositories/api/index.js';
export * from './schema/api/index.js';

export type DatabaseClient = ReturnType<typeof postgres>;
export type ApiDatabase = PostgresJsDatabase<typeof apiSchema>;
export type ApiDatabaseInstance = {
  client: DatabaseClient;
  db: ApiDatabase;
};

export function createApiDatabase(env: RuntimeEnv): ApiDatabaseInstance {
  const { connectionString } = getApiDatabaseConfig(env);
  const client = postgres(connectionString, { prepare: false });

  return {
    client,
    db: drizzle(client, { schema: apiSchema }),
  };
}

export async function closeApiDatabase(
  instance: ApiDatabaseInstance,
): Promise<void> {
  await instance.client.end();
}
