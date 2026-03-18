import { getDatabaseUrl, type RuntimeEnv } from '@monorepo/config';

export function getDatabaseConfig(env: RuntimeEnv) {
  return {
    connectionString: getDatabaseUrl(env),
  };
}
