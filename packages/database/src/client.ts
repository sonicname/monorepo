import type { RuntimeEnv } from '@monorepo/config';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getDatabaseConfig } from './config.js';
import * as schema from './schema/index.js';

export type DatabaseSchema = typeof schema;
export type Database = PostgresJsDatabase<DatabaseSchema>;
export type DatabaseClient = ReturnType<typeof postgres>;
export type DatabaseInstance = {
  client: DatabaseClient;
  db: Database;
};

export function createDatabase(env: RuntimeEnv): DatabaseInstance {
  const { connectionString } = getDatabaseConfig(env);
  const client = postgres(connectionString, {
    prepare: false,
  });

  return {
    client,
    db: drizzle(client, { schema }),
  };
}

export async function closeDatabase(instance: DatabaseInstance) {
  await instance.client.end();
}
