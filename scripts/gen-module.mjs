/**
 * Generate a web module with pages directory and index route.
 *
 * Usage:
 *   pnpm gen:module <name>              # basic module
 *   pnpm gen:module <name> --layout     # with _layout.tsx
 *
 * Creates: apps/web/app/modules/<name>/pages/index.tsx (+ _layout.tsx)
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webModulesDir = path.resolve(__dirname, '..', 'apps', 'web', 'app', 'modules');

const args = process.argv.slice(2);
const name = args[0]?.trim();
const withLayout = args.includes('--layout');

if (!name || name === '--help' || name === '-h') {
  console.error('Usage: pnpm gen:module <name> [--layout]');
  console.error('Example: pnpm gen:module dashboard --layout');
  process.exit(name ? 0 : 1);
}

if (!/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('Module name must be lowercase alphanumeric with hyphens.');
  process.exit(1);
}

const pagesDir = path.join(webModulesDir, name, 'pages');

try {
  await access(pagesDir);
  console.error(`Module already exists: modules/${name}/pages/`);
  process.exit(1);
} catch {
  // doesn't exist, proceed
}

await mkdir(pagesDir, { recursive: true });

const pascalName = name
  .split('-')
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join('');

const indexContent = `import type { Route } from './+types/index';

export function meta() {
  return [{ title: '${pascalName} — Monorepo' }];
}

export default function ${pascalName}Page() {
  return (
    <main className="status-shell">
      <section className="status-grid">
        <div className="hero-card">
          <span className="eyebrow">${pascalName}</span>
          <h1 className="hero-title">${pascalName}.</h1>
        </div>
      </section>
    </main>
  );
}
`;

await writeFile(path.join(pagesDir, 'index.tsx'), indexContent);

if (withLayout) {
  const layoutContent = `import { Outlet } from 'react-router';

export default function ${pascalName}Layout() {
  return <Outlet />;
}
`;
  await writeFile(path.join(pagesDir, '_layout.tsx'), layoutContent);
}

console.log(`Created modules/${name}/pages/`);
console.log(`  index.tsx → /${name}`);
if (withLayout) console.log(`  _layout.tsx → layout wrapper`);
console.log(`\nThe route is auto-registered via modules-page-routing.`);
