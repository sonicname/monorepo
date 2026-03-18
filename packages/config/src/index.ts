export type RuntimeEnv = Record<string, string | undefined>;

const DEFAULT_PROTOCOL = 'http';
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_WEB_PORT = 5173;
const DEFAULT_API_PORT = 3001;
const DEFAULT_PUBLIC_API_BASE_PATH = '/api';
const DEFAULT_REDIS_URL = 'redis://127.0.0.1:6379';
const DEFAULT_BULLMQ_PREFIX = 'monorepo';
const DEFAULT_PROJECTS_QUEUE_NAME = 'projects';
const HEALTH_PATH = '/health';
const PROJECTS_PATH = '/projects';
const QUEUE_STATUS_PATH = '/queue';

function parsePort(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function ensureLeadingSlash(value: string) {
  return value.startsWith('/') ? value : `/${value}`;
}

function joinUrlParts(origin: string, path: string) {
  return `${trimTrailingSlash(origin)}${ensureLeadingSlash(path)}`;
}

export function getWebPort(env: RuntimeEnv) {
  return parsePort(env.WEB_PORT, DEFAULT_WEB_PORT);
}

export function getApiPort(env: RuntimeEnv) {
  return parsePort(env.API_PORT ?? env.PORT, DEFAULT_API_PORT);
}

export function getWebOrigin(env: RuntimeEnv) {
  return (
    env.WEB_URL ?? `${DEFAULT_PROTOCOL}://${DEFAULT_HOST}:${getWebPort(env)}`
  );
}

export function getApiOrigin(env: RuntimeEnv) {
  return (
    env.API_URL ?? `${DEFAULT_PROTOCOL}://${DEFAULT_HOST}:${getApiPort(env)}`
  );
}

export function getPublicApiBasePath(env: RuntimeEnv) {
  return ensureLeadingSlash(
    env.PUBLIC_API_BASE_PATH ?? DEFAULT_PUBLIC_API_BASE_PATH,
  );
}

export function getRedisUrl(env: RuntimeEnv) {
  return env.REDIS_URL ?? DEFAULT_REDIS_URL;
}

export function isBullMqEnabled(env: RuntimeEnv) {
  return env.BULLMQ_ENABLED === 'true' || Boolean(env.REDIS_URL);
}

export function getBullMqPrefix(env: RuntimeEnv) {
  return env.BULLMQ_PREFIX ?? DEFAULT_BULLMQ_PREFIX;
}

export function getProjectsQueueName(env: RuntimeEnv) {
  return env.BULLMQ_PROJECTS_QUEUE_NAME ?? DEFAULT_PROJECTS_QUEUE_NAME;
}

export function maskConnectionUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.password) {
      url.password = '***';
    }

    return url.toString();
  } catch {
    return value;
  }
}

export function getHealthPath() {
  return HEALTH_PATH;
}

export function getProjectsPath(env: RuntimeEnv) {
  return `${getPublicApiBasePath(env)}${PROJECTS_PATH}`;
}

export function getProjectsQueueStatusPath(env: RuntimeEnv) {
  return `${getProjectsPath(env)}${QUEUE_STATUS_PATH}`;
}

export function getHealthUrl(env: RuntimeEnv) {
  return joinUrlParts(getApiOrigin(env), getHealthPath());
}

export function getProjectsUrl(env: RuntimeEnv) {
  return joinUrlParts(getApiOrigin(env), getProjectsPath(env));
}

export function getProjectsQueueStatusUrl(env: RuntimeEnv) {
  return joinUrlParts(getApiOrigin(env), getProjectsQueueStatusPath(env));
}

export function getSharedRuntimeConfig(env: RuntimeEnv) {
  return {
    webPort: getWebPort(env),
    apiPort: getApiPort(env),
    webOrigin: getWebOrigin(env),
    apiOrigin: getApiOrigin(env),
    publicApiBasePath: getPublicApiBasePath(env),
    redisUrl: getRedisUrl(env),
    bullMqEnabled: isBullMqEnabled(env),
    bullMqPrefix: getBullMqPrefix(env),
    projectsQueueName: getProjectsQueueName(env),
    healthPath: getHealthPath(),
    projectsPath: getProjectsPath(env),
    projectsQueueStatusPath: getProjectsQueueStatusPath(env),
    healthUrl: getHealthUrl(env),
    projectsUrl: getProjectsUrl(env),
    projectsQueueStatusUrl: getProjectsQueueStatusUrl(env),
  };
}
