import { z } from 'zod';

export type RuntimeEnv = Record<string, unknown>;
type RuntimeEnvInput = Record<string, unknown>;

const DEFAULT_PROTOCOL = 'http';
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_WEB_PORT = 5173;
const DEFAULT_API_PORT = 3001;
const DEFAULT_PUBLIC_API_BASE_PATH = '/api/v1';
const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@127.0.0.1:5432/monorepo';
const DEFAULT_AUTH_DATABASE_URL =
  'postgresql://postgres:postgres@127.0.0.1:5432/monorepo_auth';
const DEFAULT_API_DATABASE_URL =
  'postgresql://postgres:postgres@127.0.0.1:5432/monorepo_api';
const DEFAULT_MONGO_URL = 'mongodb://127.0.0.1:27017/monorepo';
const DEFAULT_REDIS_URL = 'redis://127.0.0.1:6379';
const DEFAULT_RABBITMQ_URL = 'amqp://guest:guest@127.0.0.1:5672';
const DEFAULT_BULLMQ_PREFIX = 'monorepo';
const DEFAULT_PROJECTS_QUEUE_NAME = 'projects';
const DEFAULT_AUTH_GRPC_PORT = 5001;
const DEFAULT_AUTH_GRPC_URL = `127.0.0.1:${DEFAULT_AUTH_GRPC_PORT}`;
const HEALTH_PATH = '/health';
const PROJECTS_PATH = '/projects';
const QUEUE_STATUS_PATH = '/queue';

export const RUNTIME_ENV_KEYS = [
  'NODE_ENV',
  'PORT',
  'API_PORT',
  'WEB_PORT',
  'API_URL',
  'WEB_URL',
  'PUBLIC_API_BASE_PATH',
  'DATABASE_URL',
  'AUTH_DATABASE_URL',
  'API_DATABASE_URL',
  'REDIS_URL',
  'RABBITMQ_URL',
  'BULLMQ_ENABLED',
  'RABBITMQ_ENABLED',
  'BULLMQ_PREFIX',
  'AUTH_GRPC_PORT',
  'AUTH_GRPC_URL',
  'MONGO_URL',
  'MONGO_ENABLED',
] as const;

const httpSchemes = ['http:', 'https:'];
const databaseSchemes = ['postgres:', 'postgresql:'];
const redisSchemes = ['redis:', 'rediss:'];
const mongoSchemes = ['mongodb:', 'mongodb+srv:'];
const rabbitMqSchemes = ['amqp:', 'amqps:'];
const validatedEnvCache = new WeakMap<object, ValidatedRuntimeEnv>();

const positivePortSchema = z.preprocess(
  (value) => (value === '' || value == null ? undefined : value),
  z.coerce.number().int().positive(),
);
const httpUrlSchema = z
  .string()
  .url()
  .refine(
    (value) => httpSchemes.includes(new URL(value).protocol),
    'Must be a valid HTTP or HTTPS URL',
  );
const redisUrlSchema = z
  .string()
  .url()
  .refine(
    (value) => redisSchemes.includes(new URL(value).protocol),
    'Must be a valid Redis URL',
  );
const rabbitMqUrlSchema = z
  .string()
  .url()
  .refine(
    (value) => rabbitMqSchemes.includes(new URL(value).protocol),
    'Must be a valid AMQP URL',
  );
const mongoUrlSchema = z
  .string()
  .refine(
    (value) => mongoSchemes.some((s) => value.startsWith(s)),
    'Must be a valid MongoDB URL',
  );
const databaseUrlSchema = z
  .string()
  .url()
  .refine(
    (value) => databaseSchemes.includes(new URL(value).protocol),
    'Must be a valid PostgreSQL URL',
  );
const booleanFromEnvSchema = z.preprocess((value) => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}, z.boolean());

export const runtimeEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
    PORT: positivePortSchema.optional(),
    API_PORT: positivePortSchema.optional(),
    WEB_PORT: positivePortSchema.optional(),
    API_URL: httpUrlSchema.optional(),
    WEB_URL: httpUrlSchema.optional(),
    PUBLIC_API_BASE_PATH: z
      .string()
      .startsWith('/', 'Must start with /')
      .optional(),
    DATABASE_URL: databaseUrlSchema.optional(),
    AUTH_DATABASE_URL: databaseUrlSchema.optional(),
    API_DATABASE_URL: databaseUrlSchema.optional(),
    REDIS_URL: redisUrlSchema.optional(),
    RABBITMQ_URL: rabbitMqUrlSchema.optional(),
    BULLMQ_ENABLED: booleanFromEnvSchema.optional(),
    RABBITMQ_ENABLED: booleanFromEnvSchema.optional(),
    BULLMQ_PREFIX: z.string().min(1).optional(),
    AUTH_GRPC_PORT: positivePortSchema.optional(),
    AUTH_GRPC_URL: z.string().min(1).optional(),
    MONGO_URL: mongoUrlSchema.optional(),
    MONGO_ENABLED: booleanFromEnvSchema.optional(),
  })
  .passthrough();

export type ValidatedRuntimeEnv = z.infer<typeof runtimeEnvSchema>;

function formatRuntimeEnvErrors(error: z.ZodError) {
  return error.issues
    .map(({ path, message }) => {
      const key = path.length > 0 ? path.join('.') : 'root';
      return `${key}: ${message}`;
    })
    .join('; ');
}

export function validateRuntimeEnv(env: RuntimeEnvInput) {
  const result = runtimeEnvSchema.safeParse(env);

  if (!result.success) {
    throw new Error(
      `Environment validation failed: ${formatRuntimeEnvErrors(result.error)}`,
    );
  }

  return result.data;
}

export function getValidatedRuntimeEnv(env: RuntimeEnvInput) {
  const cached = validatedEnvCache.get(env);

  if (cached) {
    return cached;
  }

  const validatedEnv = validateRuntimeEnv(env);
  validatedEnvCache.set(env, validatedEnv);
  return validatedEnv;
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
  const validatedEnv = getValidatedRuntimeEnv(env);

  return validatedEnv.WEB_PORT ?? DEFAULT_WEB_PORT;
}

export function getApiPort(env: RuntimeEnv) {
  const validatedEnv = getValidatedRuntimeEnv(env);

  return validatedEnv.API_PORT ?? validatedEnv.PORT ?? DEFAULT_API_PORT;
}

export function getWebOrigin(env: RuntimeEnv) {
  const validatedEnv = getValidatedRuntimeEnv(env);

  return (
    validatedEnv.WEB_URL ??
    `${DEFAULT_PROTOCOL}://${DEFAULT_HOST}:${getWebPort(env)}`
  );
}

export function getApiOrigin(env: RuntimeEnv) {
  const validatedEnv = getValidatedRuntimeEnv(env);

  return (
    validatedEnv.API_URL ??
    `${DEFAULT_PROTOCOL}://${DEFAULT_HOST}:${getApiPort(env)}`
  );
}

export function getPublicApiBasePath(env: RuntimeEnv) {
  const validatedEnv = getValidatedRuntimeEnv(env);

  return ensureLeadingSlash(
    validatedEnv.PUBLIC_API_BASE_PATH ?? DEFAULT_PUBLIC_API_BASE_PATH,
  );
}

export function getRedisUrl(env: RuntimeEnv) {
  const validatedEnv = getValidatedRuntimeEnv(env);

  return validatedEnv.REDIS_URL ?? DEFAULT_REDIS_URL;
}

export function getRabbitMqUrl(env: RuntimeEnv) {
  const validatedEnv = getValidatedRuntimeEnv(env);

  return validatedEnv.RABBITMQ_URL ?? DEFAULT_RABBITMQ_URL;
}

export function getDatabaseUrl(env: RuntimeEnv) {
  const validatedEnv = getValidatedRuntimeEnv(env);

  return validatedEnv.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

export function getAuthDatabaseUrl(env: RuntimeEnv) {
  const validatedEnv = getValidatedRuntimeEnv(env);

  return validatedEnv.AUTH_DATABASE_URL ?? DEFAULT_AUTH_DATABASE_URL;
}

export function getApiDatabaseUrl(env: RuntimeEnv) {
  const validatedEnv = getValidatedRuntimeEnv(env);

  return validatedEnv.API_DATABASE_URL ?? DEFAULT_API_DATABASE_URL;
}

export function isBullMqEnabled(env: RuntimeEnv) {
  const validatedEnv = getValidatedRuntimeEnv(env);

  return validatedEnv.BULLMQ_ENABLED ?? Boolean(env.REDIS_URL);
}

export function isRabbitMqEnabled(env: RuntimeEnv) {
  const validatedEnv = getValidatedRuntimeEnv(env);

  return validatedEnv.RABBITMQ_ENABLED ?? Boolean(env.RABBITMQ_URL);
}

export function getBullMqPrefix(env: RuntimeEnv) {
  const validatedEnv = getValidatedRuntimeEnv(env);

  return validatedEnv.BULLMQ_PREFIX ?? DEFAULT_BULLMQ_PREFIX;
}

export function getProjectsQueueName(env: RuntimeEnv) {
  getValidatedRuntimeEnv(env);

  return DEFAULT_PROJECTS_QUEUE_NAME;
}

export function getAuthGrpcPort(env: RuntimeEnv) {
  const validatedEnv = getValidatedRuntimeEnv(env);

  return validatedEnv.AUTH_GRPC_PORT ?? DEFAULT_AUTH_GRPC_PORT;
}

export function getAuthGrpcUrl(env: RuntimeEnv) {
  const validatedEnv = getValidatedRuntimeEnv(env);

  return validatedEnv.AUTH_GRPC_URL ?? DEFAULT_AUTH_GRPC_URL;
}

export function getMongoUrl(env: RuntimeEnv) {
  const validatedEnv = getValidatedRuntimeEnv(env);

  return validatedEnv.MONGO_URL ?? DEFAULT_MONGO_URL;
}

export function isMongoEnabled(env: RuntimeEnv) {
  const validatedEnv = getValidatedRuntimeEnv(env);

  return validatedEnv.MONGO_ENABLED ?? Boolean(env.MONGO_URL);
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
    databaseUrl: getDatabaseUrl(env),
    redisUrl: getRedisUrl(env),
    rabbitMqUrl: getRabbitMqUrl(env),
    bullMqEnabled: isBullMqEnabled(env),
    rabbitMqEnabled: isRabbitMqEnabled(env),
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
