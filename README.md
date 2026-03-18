# Monorepo Boilerplate

PNPM workspace with two Node.js applications:

- `apps/web`: React Router v7 framework app with server-side rendering
- `apps/api`: NestJS API server

## Requirements

- Node.js 24+
- pnpm 10+

## Install

```bash
pnpm install
```

## Development

Run both apps together:

```bash
pnpm dev
```

App URLs:

- Web: <http://localhost:5173>
- API: <http://localhost:3001>

Run one app at a time:

```bash
pnpm dev:web
pnpm dev:api
```

## Production

Build both apps:

```bash
pnpm build
```

Start both production servers:

```bash
pnpm start
```

Default production ports:

- Web: <http://localhost:3000>
- API: <http://localhost:3001>

## Other Scripts

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm format
```
