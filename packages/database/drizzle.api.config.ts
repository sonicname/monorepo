import { defineConfig } from 'drizzle-kit';

const url =
  process.env.API_DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:5432/monorepo_api';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/api/index.ts',
  out: './drizzle/api',
  dbCredentials: { url },
});
