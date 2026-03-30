/**
 * Validate .env files match their .env.example templates.
 *
 * Usage: pnpm check:env
 *
 * For each .env.example, checks that a .env file exists and contains
 * all required variable names. Reports missing vars per app/package.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const targets = [
  'apps/api',
  'apps/auth',
  'apps/web',
  'packages/database',
];

function extractVarNames(content) {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('=')[0]?.trim())
    .filter(Boolean);
}

let hasErrors = false;

for (const target of targets) {
  const examplePath = path.join(root, target, '.env.example');
  const envPath = path.join(root, target, '.env');

  let exampleContent;
  try {
    exampleContent = await readFile(examplePath, 'utf8');
  } catch {
    continue; // no .env.example, skip
  }

  const requiredVars = extractVarNames(exampleContent);

  let envContent;
  try {
    envContent = await readFile(envPath, 'utf8');
  } catch {
    console.error(`\x1b[31m✗ ${target}/.env\x1b[0m — file missing`);
    console.error(`  Copy from: cp ${target}/.env.example ${target}/.env\n`);
    hasErrors = true;
    continue;
  }

  const presentVars = new Set(extractVarNames(envContent));
  const missing = requiredVars.filter((v) => !presentVars.has(v));

  if (missing.length > 0) {
    console.error(`\x1b[33m⚠ ${target}/.env\x1b[0m — ${missing.length} missing variable(s):`);
    for (const v of missing) {
      console.error(`  - ${v}`);
    }
    console.error('');
    hasErrors = true;
  } else {
    console.log(`\x1b[32m✓ ${target}/.env\x1b[0m — all ${requiredVars.length} variables present`);
  }
}

if (hasErrors) {
  process.exit(1);
}
