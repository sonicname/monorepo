import {
  getApiDatabaseUrl,
  getAuthDatabaseUrl,
  getDatabaseUrl,
  type RuntimeEnv,
} from '@monorepo/config';

export function getDatabaseConfig(env: RuntimeEnv) {
  return {
    connectionString: getDatabaseUrl(env),
  };
}

export function getAuthDatabaseConfig(env: RuntimeEnv) {
  return {
    connectionString: getAuthDatabaseUrl(env),
  };
}

export function getApiDatabaseConfig(env: RuntimeEnv) {
  return {
    connectionString: getApiDatabaseUrl(env),
  };
}
