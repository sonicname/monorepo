/**
 * Check for circular dependencies between workspace packages.
 *
 * Usage: pnpm check:deps
 *
 * Reads each package's package.json and builds a dependency graph,
 * then reports any cycles found.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const packagesDir = path.join(root, 'packages');

const packages = new Map();

// Collect all workspace package names and their workspace dependencies
const entries = await readdir(packagesDir, { withFileTypes: true });

for (const entry of entries) {
  if (!entry.isDirectory()) continue;

  const pkgPath = path.join(packagesDir, entry.name, 'package.json');
  try {
    const raw = await readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    const deps = Object.keys(pkg.dependencies ?? {}).filter((d) =>
      d.startsWith('@monorepo/'),
    );
    packages.set(pkg.name, deps);
  } catch {
    // skip if no package.json
  }
}

// Also check apps
for (const appName of ['api', 'auth', 'web']) {
  const pkgPath = path.join(root, 'apps', appName, 'package.json');
  try {
    const raw = await readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    const deps = Object.keys(pkg.dependencies ?? {}).filter((d) =>
      d.startsWith('@monorepo/'),
    );
    packages.set(pkg.name, deps);
  } catch {
    // skip
  }
}

// Detect cycles via DFS
const cycles = [];

function findCycles(node, visited, stack, pathSoFar) {
  if (stack.has(node)) {
    const cycleStart = pathSoFar.indexOf(node);
    cycles.push(pathSoFar.slice(cycleStart).concat(node));
    return;
  }
  if (visited.has(node)) return;

  visited.add(node);
  stack.add(node);
  pathSoFar.push(node);

  for (const dep of packages.get(node) ?? []) {
    if (packages.has(dep)) {
      findCycles(dep, visited, stack, [...pathSoFar]);
    }
  }

  stack.delete(node);
}

const visited = new Set();
for (const name of packages.keys()) {
  findCycles(name, visited, new Set(), []);
}

// Print dependency graph
console.log('Workspace dependency graph:\n');
for (const [name, deps] of [...packages.entries()].sort()) {
  const depList = deps.length > 0 ? deps.join(', ') : '(none)';
  console.log(`  ${name} → ${depList}`);
}

console.log('');

if (cycles.length === 0) {
  console.log('No circular dependencies found.');
} else {
  console.error(`Found ${cycles.length} circular dependency chain(s):\n`);
  for (const cycle of cycles) {
    console.error(`  ${cycle.join(' → ')}`);
  }
  process.exit(1);
}
