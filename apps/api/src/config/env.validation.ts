import { z } from 'zod';

const httpSchemes = ['http:', 'https:'];
const redisSchemes = ['redis:', 'rediss:'];

const positivePortSchema = z.coerce.number().int().positive();
const httpUrlSchema = z
  .url()
  .refine(
    (value) => httpSchemes.includes(new URL(value).protocol),
    'Must be a valid HTTP or HTTPS URL',
  );
const redisUrlSchema = z
  .url()
  .refine(
    (value) => redisSchemes.includes(new URL(value).protocol),
    'Must be a valid Redis URL',
  );
const booleanFromEnvSchema = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => value === true || value === 'true');

const appEnvSchema = z
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
    REDIS_URL: redisUrlSchema.optional(),
    BULLMQ_ENABLED: booleanFromEnvSchema.optional(),
    BULLMQ_PREFIX: z.string().min(1).optional(),
    BULLMQ_PROJECTS_QUEUE_NAME: z.string().min(1).optional(),
  })
  .passthrough();

export function validateAppEnv(config: Record<string, unknown>) {
  const result = appEnvSchema.safeParse(config);

  if (result.success) {
    return result.data;
  }

  const message = result.error.issues
    .map(({ path, message: issueMessage }) => {
      const key = path.length > 0 ? path.join('.') : 'root';
      return `${key}: ${issueMessage}`;
    })
    .join('; ');

  throw new Error(`Environment validation failed: ${message}`);
}
