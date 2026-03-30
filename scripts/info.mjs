/**
 * Print monorepo overview: versions, apps, packages, ports, and env status.
 *
 * Usage: pnpm info
 */

import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Root info
const rootPkg = await readJson(path.join(root, 'package.json'));
const nodeVersion = process.version;
const pnpmVersion = rootPkg.packageManager?.replace('pnpm@', '') ?? 'unknown';

console.log('\x1b[1mMonorepo Info\x1b[0m\n');
console.log(`  Node.js:    ${nodeVersion}`);
console.log(`  pnpm:       ${pnpmVersion}`);
console.log('');

// Apps
console.log('\x1b[1mApps\x1b[0m\n');

const apps = [
  { name: 'web', port: 'WEB_PORT', defaultPort: '5173' },
  { name: 'api', port: 'API_PORT', defaultPort: '3001' },
  { name: 'auth', port: 'AUTH_PORT', defaultPort: '3002' },
];

for (const app of apps) {
  const pkgPath = path.join(root, 'apps', app.name, 'package.json');
  const pkg = await readJson(pkgPath);
  const hasEnv = await fileExists(path.join(root, 'apps', app.name, '.env'));
  const envStatus = hasEnv ? '\x1b[32m.env\x1b[0m' : '\x1b[33mno .env\x1b[0m';
  const deps = Object.keys(pkg.dependencies ?? {})
    .filter((d) => d.startsWith('@monorepo/'))
    .map((d) => d.replace('@monorepo/', ''))
    .join(', ');

  console.log(`  \x1b[36m${app.name}\x1b[0m (${pkg.name}@${pkg.version})`);
  console.log(`    Port: ${app.defaultPort}  |  Env: ${envStatus}  |  Packages: ${deps || '(none)'}`);
}
console.log('');

// Packages
console.log('\x1b[1mPackages\x1b[0m\n');

const pkgEntries = await readdir(path.join(root, 'packages'), { withFileTypes: true });
const pkgNames = pkgEntries.filter((e) => e.isDirectory()).map((e) => e.name).sort();

for (const name of pkgNames) {
  const pkgPath = path.join(root, 'packages', name, 'package.json');
  try {
    const pkg = await readJson(pkgPath);
    const hasExports = pkg.exports ? Object.keys(pkg.exports).length : 0;
    const hasDist = await fileExists(path.join(root, 'packages', name, 'dist'));
    const buildStatus = hasDist ? '\x1b[32mbuilt\x1b[0m' : '\x1b[33mnot built\x1b[0m';
    console.log(`  \x1b[36m@monorepo/${name}\x1b[0m  ${buildStatus}  (${hasExports} export${hasExports !== 1 ? 's' : ''})`);
  } catch {
    console.log(`  \x1b[36m@monorepo/${name}\x1b[0m  \x1b[31mno package.json\x1b[0m`);
  }
}
console.log('');

// Services
console.log('\x1b[1mService Ports\x1b[0m\n');

const ports = [
  ['Traefik', '80'],
  ['Traefik Dashboard', '8080'],
  ['Web', '5173'],
  ['Auth HTTP', '3002'],
  ['Auth gRPC', '5001'],
  ['API', '3001'],
  ['PostgreSQL', '5432'],
  ['Redis', '6379'],
  ['RabbitMQ', '5672'],
  ['RabbitMQ UI', '15672'],
  ['MailDev UI', '1080'],
  ['MailDev SMTP', '1025'],
];

for (const [name, port] of ports) {
  console.log(`  ${name.padEnd(18)} :${port}`);
}

console.log('');
console.log('\x1b[2mRun `pnpm check:env` to validate environment files.\x1b[0m');
