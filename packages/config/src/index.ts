export type RuntimeEnv = Record<string, string | undefined>;

const DEFAULT_PROTOCOL = 'http';
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_WEB_PORT = 5173;
const DEFAULT_API_PORT = 3001;
const DEFAULT_PUBLIC_API_BASE_PATH = '/api';
const HEALTH_PATH = '/health';
const PROJECTS_PATH = '/projects';

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

export function getHealthPath() {
  return HEALTH_PATH;
}

export function getProjectsPath(env: RuntimeEnv) {
  return `${getPublicApiBasePath(env)}${PROJECTS_PATH}`;
}

export function getHealthUrl(env: RuntimeEnv) {
  return joinUrlParts(getApiOrigin(env), getHealthPath());
}

export function getProjectsUrl(env: RuntimeEnv) {
  return joinUrlParts(getApiOrigin(env), getProjectsPath(env));
}

export function getSharedRuntimeConfig(env: RuntimeEnv) {
  return {
    webPort: getWebPort(env),
    apiPort: getApiPort(env),
    webOrigin: getWebOrigin(env),
    apiOrigin: getApiOrigin(env),
    publicApiBasePath: getPublicApiBasePath(env),
    healthPath: getHealthPath(),
    projectsPath: getProjectsPath(env),
    healthUrl: getHealthUrl(env),
    projectsUrl: getProjectsUrl(env),
  };
}
