/**
 * Generate a NestJS service module scaffold in an app.
 *
 * Usage:
 *   pnpm gen:service <name>                 # defaults to apps/api
 *   pnpm gen:service <name> --app auth      # target apps/auth
 *
 * Creates: apps/<app>/src/<name>/{<name>.module.ts, <name>.controller.ts,
 *          <name>.service.ts, <name>.controller.spec.ts}
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const name = args[0]?.trim();
let app = 'api';

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--app' && args[i + 1]) {
    app = args[++i].trim();
  }
}

if (!name || name === '--help' || name === '-h') {
  console.error('Usage: pnpm gen:service <name> [--app api|auth]');
  console.error('Example: pnpm gen:service notifications --app api');
  process.exit(name ? 0 : 1);
}

if (!/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('Service name must be lowercase alphanumeric with hyphens.');
  process.exit(1);
}

const serviceDir = path.join(root, 'apps', app, 'src', name);

try {
  await access(serviceDir);
  console.error(`Module already exists: apps/${app}/src/${name}/`);
  process.exit(1);
} catch {
  // doesn't exist
}

await mkdir(serviceDir, { recursive: true });

const pascal = name
  .split('-')
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join('');

const moduleTs = `import { Module } from '@nestjs/common';
import { ${pascal}Controller } from './${name}.controller.js';
import { ${pascal}Service } from './${name}.service.js';

@Module({
  controllers: [${pascal}Controller],
  providers: [${pascal}Service],
  exports: [${pascal}Service],
})
export class ${pascal}Module {}
`;

const serviceTs = `import { Injectable } from '@nestjs/common';

@Injectable()
export class ${pascal}Service {}
`;

const controllerTs = `import { Controller } from '@nestjs/common';
import { ${pascal}Service } from './${name}.service.js';

@Controller('${name}')
export class ${pascal}Controller {
  constructor(private readonly ${pascal.charAt(0).toLowerCase() + pascal.slice(1)}Service: ${pascal}Service) {}
}
`;

const specTs = `import { Test, TestingModule } from '@nestjs/testing';
import { ${pascal}Controller } from './${name}.controller';

describe('${pascal}Controller', () => {
  let controller: ${pascal}Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [${pascal}Controller],
      providers: [
        { provide: '${pascal}Service', useValue: {} },
      ],
    }).compile();

    controller = module.get<${pascal}Controller>(${pascal}Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
`;

await writeFile(path.join(serviceDir, `${name}.module.ts`), moduleTs);
await writeFile(path.join(serviceDir, `${name}.service.ts`), serviceTs);
await writeFile(path.join(serviceDir, `${name}.controller.ts`), controllerTs);
await writeFile(path.join(serviceDir, `${name}.controller.spec.ts`), specTs);

console.log(`Created apps/${app}/src/${name}/`);
console.log(`  ${name}.module.ts`);
console.log(`  ${name}.service.ts`);
console.log(`  ${name}.controller.ts`);
console.log(`  ${name}.controller.spec.ts`);
console.log(`\nNext: import ${pascal}Module in apps/${app}/src/app.module.ts`);
