import { defineConfig } from 'drizzle-kit';

const url =
  process.env.AUTH_DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:5432/monorepo_auth';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/auth/index.ts',
  out: './drizzle/auth',
  dbCredentials: { url },
});
