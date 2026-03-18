import type { ProjectsResponse } from '@monorepo/contracts';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectsService {
  getProjects(): ProjectsResponse {
    const generatedAt = new Date().toISOString();

    return {
      generatedAt,
      items: [
        {
          id: 'web-ssr-shell',
          name: 'Web SSR Shell',
          summary:
            'The React Router app renders server-side and verifies API connectivity during the route loader.',
          status: 'complete',
          stack: ['react-router', 'react', 'tailwindcss'],
          updatedAt: generatedAt,
        },
        {
          id: 'nestjs-api',
          name: 'Nest API Surface',
          summary:
            'The API exposes health and projects endpoints with contracts shared from the workspace package.',
          status: 'in-progress',
          stack: ['nestjs', 'typescript'],
          updatedAt: generatedAt,
        },
        {
          id: 'shared-contracts',
          name: 'Shared Contracts',
          summary:
            'Response shapes live in packages/contracts so web and API stay aligned as new features land.',
          status: 'planned',
          stack: ['pnpm-workspace', 'typescript'],
          updatedAt: generatedAt,
        },
      ],
    };
  }
}