import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const rawName = args[0]?.trim();

const externalDependencies = [];
const workspaceDependencies = [];
const subpathExports = [];
let withTest = false;

if (!rawName || rawName === '--help' || rawName === '-h') {
  console.error('Usage: pnpm gen:package <name>');
  console.error(
    'Example: pnpm gen:package utils --workspace-dep config --dep zod@^4.3.6 --export cli --with-test',
  );
  process.exit(rawName ? 0 : 1);
}

if (!/^[a-z0-9-]+$/.test(rawName)) {
  console.error(
    'Package name must contain only lowercase letters, numbers, and hyphens.',
  );
  process.exit(1);
}

for (let index = 1; index < args.length; index += 1) {
  const arg = args[index];

  if (arg === '--with-test') {
    withTest = true;
    continue;
  }

  if (arg === '--dep') {
    const spec = args[index + 1]?.trim();

    if (!spec) {
      console.error('Missing value for --dep. Use --dep <name@version>.');
      process.exit(1);
    }

    externalDependencies.push(spec);
    index += 1;
    continue;
  }

  if (arg === '--workspace-dep') {
    const spec = args[index + 1]?.trim();

    if (!spec) {
      console.error(
        'Missing value for --workspace-dep. Use --workspace-dep <package-name>.',
      );
      process.exit(1);
    }

    workspaceDependencies.push(spec);
    index += 1;
    continue;
  }

  if (arg === '--export') {
    const spec = args[index + 1]?.trim();

    if (!spec) {
      console.error('Missing value for --export. Use --export <subpath>.');
      process.exit(1);
    }

    subpathExports.push(spec);
    index += 1;
    continue;
  }

  console.error(`Unknown option: ${arg}`);
  process.exit(1);
}

const parseDependencySpec = (spec) => {
  const separatorIndex = spec.lastIndexOf('@');

  if (separatorIndex <= 0) {
    console.error(`Invalid dependency spec: ${spec}. Use <name@version>.`);
    process.exit(1);
  }

  const name = spec.slice(0, separatorIndex);
  const version = spec.slice(separatorIndex + 1);

  if (!name || !version) {
    console.error(`Invalid dependency spec: ${spec}. Use <name@version>.`);
    process.exit(1);
  }

  return [name, version];
};

const normalizeWorkspaceDependency = (spec) => {
  if (/^@monorepo\/[a-z0-9-]+$/.test(spec)) {
    return spec;
  }

  if (!/^[a-z0-9-]+$/.test(spec)) {
    console.error(
      `Invalid workspace dependency: ${spec}. Use <name> or @monorepo/<name>.`,
    );
    process.exit(1);
  }

  return `@monorepo/${spec}`;
};

const normalizeExportPath = (spec) => {
  const normalized = spec.replace(/^\.\//, '');

  if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(normalized)) {
    console.error(
      `Invalid export subpath: ${spec}. Use lowercase path segments like cli or rabbitmq/helpers.`,
    );
    process.exit(1);
  }

  return normalized;
};

const packageDir = path.join(workspaceRoot, 'packages', rawName);
const srcDir = path.join(packageDir, 'src');

const dependencies = Object.fromEntries(
  externalDependencies.map(parseDependencySpec),
);
const normalizedSubpathExports = [
  ...new Set(subpathExports.map(normalizeExportPath)),
];

for (const dependency of workspaceDependencies.map(
  normalizeWorkspaceDependency,
)) {
  dependencies[dependency] = 'workspace:*';
}

const exportsField = {
  '.': {
    types: './dist/index.d.ts',
    default: './dist/index.js',
  },
};

for (const subpath of normalizedSubpathExports) {
  exportsField[`./${subpath}`] = {
    types: `./dist/${subpath}/index.d.ts`,
    default: `./dist/${subpath}/index.js`,
  };
}

const packageJson = {
  name: `@monorepo/${rawName}`,
  version: '0.0.1',
  private: true,
  type: 'module',
  types: './dist/index.d.ts',
  main: './dist/index.js',
  exports: exportsField,
  scripts: {
    build: 'tsc -p tsconfig.json',
    typecheck: 'tsc --noEmit -p tsconfig.json',
    watch: 'tsc -p tsconfig.json --watch --preserveWatchOutput',
    ...(withTest
      ? { test: 'pnpm run build && node --test dist/**/*.test.js' }
      : {}),
  },
  devDependencies: {
    typescript: '^5.9.2',
    ...(withTest ? { '@types/node': '^22.19.15' } : {}),
  },
  files: ['dist'],
  ...(Object.keys(dependencies).length > 0 ? { dependencies } : {}),
};

const tsconfig = {
  compilerOptions: {
    target: 'ES2022',
    module: 'ES2022',
    moduleResolution: 'bundler',
    declaration: true,
    outDir: 'dist',
    rootDir: 'src',
    strict: true,
    skipLibCheck: true,
    ...(withTest ? { types: ['node'] } : {}),
  },
  include: ['src/**/*.ts'],
  exclude: ['dist'],
};

const indexTs = 'export {};' + '\n';
const testTs = [
  "import assert from 'node:assert/strict';",
  "import test from 'node:test';",
  '',
  "test('package scaffold works', () => {",
  '  assert.equal(true, true);',
  '});',
  '',
].join('\n');

try {
  await mkdir(packageDir, { recursive: false });
} catch (error) {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'EEXIST'
  ) {
    console.error(`Package directory already exists: packages/${rawName}`);
    process.exit(1);
  }

  throw error;
}

await mkdir(srcDir, { recursive: false });

for (const subpath of normalizedSubpathExports) {
  await mkdir(path.join(srcDir, subpath), { recursive: true });
}

await writeFile(
  path.join(packageDir, 'package.json'),
  `${JSON.stringify(packageJson, null, 2)}\n`,
);
await writeFile(
  path.join(packageDir, 'tsconfig.json'),
  `${JSON.stringify(tsconfig, null, 2)}\n`,
);
await writeFile(path.join(srcDir, 'index.ts'), indexTs);

for (const subpath of normalizedSubpathExports) {
  await writeFile(path.join(srcDir, subpath, 'index.ts'), indexTs);
}

if (withTest) {
  await writeFile(path.join(srcDir, 'index.test.ts'), testTs);
}

console.log(`Created packages/${rawName}`);
console.log(`Package name: @monorepo/${rawName}`);
if (Object.keys(dependencies).length > 0) {
  console.log(`Dependencies: ${Object.keys(dependencies).join(', ')}`);
}
if (normalizedSubpathExports.length > 0) {
  console.log(`Subpath exports: ${normalizedSubpathExports.join(', ')}`);
}
if (withTest) {
  console.log('Included default test scaffold');
}
console.log('Next steps:');
console.log(`  1. pnpm install`);
console.log(`  2. pnpm --filter @monorepo/${rawName} build`);
