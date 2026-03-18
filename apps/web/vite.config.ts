import { getApiOrigin, getPublicApiBasePath, getWebPort } from '@monorepo/config';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const publicApiBasePath = getPublicApiBasePath(process.env);

export default defineConfig({
  server: {
    port: getWebPort(process.env),
    proxy: {
      [publicApiBasePath]: getApiOrigin(process.env),
    },
  },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
});
