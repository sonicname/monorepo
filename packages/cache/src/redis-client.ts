import { getRedisUrl, type RuntimeEnv } from '@monorepo/config';
import Redis, { type RedisOptions } from 'ioredis';

/** Parse REDIS_URL into ioredis connection options. */
export function parseRedisUrl(env: RuntimeEnv): RedisOptions {
  const url = new URL(getRedisUrl(env));
  const usesTls = url.protocol === 'rediss:';
  const dbPath = url.pathname.replace('/', '');
  const db = dbPath ? Number(dbPath) : undefined;

  return {
    host: url.hostname,
    port: Number(url.port || (usesTls ? 6380 : 6379)),
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number.isInteger(db) ? db : undefined,
    tls: usesTls ? {} : undefined,
    lazyConnect: true,
  };
}

/** Create a new ioredis client from REDIS_URL. */
export function createRedisClient(
  env: RuntimeEnv,
  overrides?: RedisOptions,
): Redis {
  return new Redis({ ...parseRedisUrl(env), ...overrides });
}
