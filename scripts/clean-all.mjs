/**
 * Deep clean all build artifacts, caches, and optionally node_modules.
 *
 * Usage:
 *   pnpm clean:all              # clean build artifacts only
 *   pnpm clean:all --modules    # also remove all node_modules
 */

import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const removeModules = process.argv.includes('--modules');

const targets = [
  // Web
  'apps/web/build',
  'apps/web/.react-router',
  // API
  'apps/api/dist',
  'apps/api/coverage',
  // Auth
  'apps/auth/dist',
  'apps/auth/coverage',
  // Packages
  'packages/cache/dist',
  'packages/config/dist',
  'packages/constants/dist',
  'packages/contracts/dist',
  'packages/database/dist',
  'packages/email/dist',
  'packages/proto/dist',
  'packages/queues/dist',
  'packages/storage/dist',
  // TSBuild caches
  'packages/cache/.tsbuild',
  'packages/config/.tsbuild',
  'packages/constants/.tsbuild',
  'packages/contracts/.tsbuild',
  'packages/database/.tsbuild',
  'packages/email/.tsbuild',
  'packages/proto/.tsbuild',
  'packages/queues/.tsbuild',
  'packages/storage/.tsbuild',
];

if (removeModules) {
  targets.push(
    'node_modules',
    'apps/web/node_modules',
    'apps/api/node_modules',
    'apps/auth/node_modules',
    'packages/cache/node_modules',
    'packages/config/node_modules',
    'packages/constants/node_modules',
    'packages/contracts/node_modules',
    'packages/database/node_modules',
    'packages/email/node_modules',
    'packages/proto/node_modules',
    'packages/queues/node_modules',
    'packages/storage/node_modules',
  );
}

let removed = 0;

for (const target of targets) {
  const fullPath = path.join(root, target);
  try {
    await rm(fullPath, { recursive: true, force: true });
    removed++;
  } catch {
    // doesn't exist, skip silently
  }
}

console.log(`Cleaned ${removed} directories.`);
if (removeModules) {
  console.log('Run `pnpm install` to reinstall dependencies.');
}
