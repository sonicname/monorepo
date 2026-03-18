import type { ProjectSummary } from '@monorepo/contracts';
import { asc } from 'drizzle-orm';
import type { Database } from '../client.js';
import { projectsTable } from '../schema/index.js';

const DEFAULT_PROJECTS: ProjectSummary[] = [
  {
    id: 'web-ssr-shell',
    name: 'Web SSR Shell',
    summary:
      'The React Router app renders server-side and verifies API connectivity during the route loader.',
    status: 'complete',
    stack: ['react-router', 'react', 'tailwindcss'],
    updatedAt: '2026-03-18T00:00:00.000Z',
  },
  {
    id: 'nestjs-api',
    name: 'Nest API Surface',
    summary:
      'The API exposes health and projects endpoints with contracts shared from the workspace package.',
    status: 'in-progress',
    stack: ['nestjs', 'typescript'],
    updatedAt: '2026-03-18T00:00:00.000Z',
  },
  {
    id: 'shared-contracts',
    name: 'Shared Contracts',
    summary:
      'Response shapes live in packages/contracts so web and API stay aligned as new features land.',
    status: 'planned',
    stack: ['pnpm-workspace', 'typescript'],
    updatedAt: '2026-03-18T00:00:00.000Z',
  },
];

function mapProject(row: typeof projectsTable.$inferSelect): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    summary: row.summary,
    status: row.status,
    stack: row.stack,
    updatedAt: row.updatedAt,
  };
}

export function createProjectsRepository(db: Database) {
  return {
    async list(): Promise<ProjectSummary[]> {
      const rows = await db
        .select()
        .from(projectsTable)
        .orderBy(asc(projectsTable.createdAt));

      return rows.map(mapProject);
    },

    async seedDefaults() {
      await db
        .insert(projectsTable)
        .values(
          DEFAULT_PROJECTS.map((project) => ({
            id: project.id,
            name: project.name,
            summary: project.summary,
            status: project.status,
            stack: project.stack,
            updatedAt: project.updatedAt,
          })),
        )
        .onConflictDoNothing({
          target: projectsTable.id,
        });
    },
  };
}

export type ProjectsRepository = ReturnType<typeof createProjectsRepository>;
