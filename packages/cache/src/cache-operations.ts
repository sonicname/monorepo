import type Redis from 'ioredis';

export interface CacheSetOptions {
  /** Time-to-live in seconds. */
  ttl?: number;
}

/**
 * Get a cached value, automatically deserialised from JSON.
 * Returns `null` when the key does not exist.
 */
export async function cacheGet<T = unknown>(
  redis: Redis,
  key: string,
): Promise<T | null> {
  const raw = await redis.get(key);
  if (raw === null) return null;

  return JSON.parse(raw) as T;
}

/** Set a cached value, serialised as JSON. Optionally set a TTL in seconds. */
export async function cacheSet(
  redis: Redis,
  key: string,
  value: unknown,
  options?: CacheSetOptions,
): Promise<void> {
  const serialised = JSON.stringify(value);

  if (options?.ttl && options.ttl > 0) {
    await redis.set(key, serialised, 'EX', options.ttl);
  } else {
    await redis.set(key, serialised);
  }
}

/** Delete one or more cache keys. Returns the number of keys removed. */
export async function cacheDel(
  redis: Redis,
  ...keys: string[]
): Promise<number> {
  if (keys.length === 0) return 0;
  return redis.del(...keys);
}

/** Check whether a key exists (1 = yes, 0 = no). */
export async function cacheExists(
  redis: Redis,
  key: string,
): Promise<boolean> {
  return (await redis.exists(key)) === 1;
}

/** Set the TTL (in seconds) on an existing key. */
export async function cacheExpire(
  redis: Redis,
  key: string,
  ttl: number,
): Promise<boolean> {
  return (await redis.expire(key, ttl)) === 1;
}

/** Get remaining TTL in seconds. Returns -1 if no expiry, -2 if key missing. */
export async function cacheTtl(
  redis: Redis,
  key: string,
): Promise<number> {
  return redis.ttl(key);
}
