import {
  getApiOrigin,
  getHealthUrl,
  getProjectsUrl,
  getPublicApiBasePath,
} from '@monorepo/config';
import type {
  ApiHealth,
  ProjectSummary,
  ProjectsResponse,
} from '@monorepo/contracts';
import type { Route } from './+types/home';

function getApiBaseUrl() {
  return getApiOrigin(process.env);
}

async function fetchApiJson<T>(input: string): Promise<T> {
  const response = await fetch(input, {
    headers: {
      accept: 'application/json',
    },
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) {
    throw new Error(`API responded with ${response.status} for ${input}`);
  }

  return (await response.json()) as T;
}

function getStatusTone(status: ProjectSummary['status']) {
  switch (status) {
    case 'complete':
      return 'tone-complete';
    case 'in-progress':
      return 'tone-progress';
    default:
      return 'tone-planned';
  }
}

export async function loader() {
  const apiBaseUrl = getApiBaseUrl();
  const publicApiBasePath = getPublicApiBasePath(process.env);
  const checkedAt = new Date().toISOString();
  const healthUrl = getHealthUrl(process.env);
  const projectsUrl = getProjectsUrl(process.env);

  const [healthResult, projectsResult] = await Promise.allSettled([
    fetchApiJson<ApiHealth>(healthUrl),
    fetchApiJson<ProjectsResponse>(projectsUrl),
  ]);

  const health =
    healthResult.status === 'fulfilled' ? healthResult.value : null;
  const projects =
    projectsResult.status === 'fulfilled' ? projectsResult.value : null;
  const isHealthy = healthResult.status === 'fulfilled';
  const errorMessage = [healthResult, projectsResult]
    .filter((result) => result.status === 'rejected')
    .map((result) =>
      result.reason instanceof Error
        ? result.reason.message
        : 'Unknown API error',
    )
    .join(' | ');

  return {
    apiBaseUrl,
    publicApiBasePath,
    healthUrl,
    projectsUrl,
    health,
    projects,
    isHealthy,
    checkedAt,
    error: errorMessage || null,
  };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Web + API Monorepo' },
    {
      name: 'description',
      content:
        'SSR React Router app connected to a NestJS API inside one pnpm workspace.',
    },
  ];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const statusClass = loaderData.isHealthy ? 'is-ok' : 'is-error';
  const statusLabel = loaderData.isHealthy
    ? 'API reachable'
    : 'API unavailable';
  const timestamp = loaderData.health?.timestamp ?? loaderData.checkedAt;
  const projectCount = loaderData.projects?.items.length ?? 0;
  const projectsTimestamp =
    loaderData.projects?.generatedAt ?? loaderData.checkedAt;

  return (
    <main className='status-shell'>
      <section className='status-grid'>
        <div className='hero-card'>
          <span className='eyebrow'>Monorepo starter</span>
          <h1 className='hero-title'>React Router SSR with Nest behind it.</h1>
          <p className='hero-copy'>
            This page is rendered by the React Router server and checks the Nest
            API during the route loader. It gives you a working end-to-end
            baseline for adding real data, auth, or shared packages next.
          </p>

          <div className='stats-row'>
            <article className='status-card'>
              <p className='status-label'>Workspace</p>
              <p className='status-value'>pnpm monorepo</p>
              <div className='detail-list'>
                <div className='detail-item'>
                  <span className='detail-key'>Web app</span>
                  <span className='detail-value'>
                    React Router v7 framework mode with SSR
                  </span>
                </div>
                <div className='detail-item'>
                  <span className='detail-key'>API app</span>
                  <span className='detail-value'>
                    NestJS on port 3001 with CORS enabled
                  </span>
                </div>
                <div className='detail-item'>
                  <span className='detail-key'>Shared package</span>
                  <span className='detail-value'>
                    @monorepo/config centralizes ports, origins, and public API
                    paths
                  </span>
                </div>
              </div>
            </article>

            <article className='status-card'>
              <p className='status-label'>Current status</p>
              <div className={`status-pill ${statusClass}`}>{statusLabel}</div>
              <div className='detail-list'>
                <div className='detail-item'>
                  <span className='detail-key'>Checked at</span>
                  <span className='detail-value'>
                    {new Date(timestamp).toLocaleString()}
                  </span>
                </div>
                <div className='detail-item'>
                  <span className='detail-key'>Projects loaded</span>
                  <span className='detail-value'>
                    {projectCount > 0
                      ? `${projectCount} items from /api/projects`
                      : loaderData.error}
                  </span>
                </div>
              </div>
            </article>
          </div>
        </div>

        <div className='endpoint-card'>
          <p className='status-label'>Integration details</p>
          <div className='detail-list'>
            <div className='detail-item'>
              <span className='detail-key'>API base URL</span>
              <span className='detail-value'>{loaderData.apiBaseUrl}</span>
            </div>
            <div className='detail-item'>
              <span className='detail-key'>Health endpoint</span>
              <span className='detail-value'>{loaderData.healthUrl}</span>
            </div>
            <div className='detail-item'>
              <span className='detail-key'>Public API base path</span>
              <span className='detail-value'>
                {loaderData.publicApiBasePath}
              </span>
            </div>
            <div className='detail-item'>
              <span className='detail-key'>Projects endpoint</span>
              <span className='detail-value'>{loaderData.projectsUrl}</span>
            </div>
            <div className='detail-item'>
              <span className='detail-key'>Response status</span>
              <span className='detail-value'>
                {loaderData.health?.status ?? 'error'}
              </span>
            </div>
            <div className='detail-item'>
              <span className='detail-key'>Service name</span>
              <span className='detail-value'>
                {loaderData.health?.name ?? 'api'}
              </span>
            </div>
            <div className='detail-item'>
              <span className='detail-key'>Projects snapshot</span>
              <span className='detail-value'>
                {new Date(projectsTimestamp).toLocaleString()}
              </span>
            </div>
          </div>

          <div className='endpoint-list'>
            <div className='endpoint-chip'>
              <span className='endpoint-method'>GET</span>
              <span>{loaderData.healthUrl}</span>
            </div>
            <div className='endpoint-chip'>
              <span className='endpoint-method'>GET</span>
              <span>{loaderData.projectsUrl}</span>
            </div>
            <div className='endpoint-chip'>
              <span className='endpoint-method'>DEV</span>
              <span>pnpm dev</span>
            </div>
            <div className='endpoint-chip'>
              <span className='endpoint-method'>BUILD</span>
              <span>pnpm build</span>
            </div>
          </div>
        </div>
      </section>

      <section className='projects-panel'>
        <div className='projects-header'>
          <div>
            <p className='status-label'>Project feed</p>
            <h2 className='projects-title'>
              Typed data from Nest rendered in the SSR route.
            </h2>
          </div>
          <p className='projects-subtitle'>
            This list comes from the shared `ProjectsResponse` contract and the
            `GET /api/projects` endpoint.
          </p>
        </div>

        <div className='projects-list'>
          {loaderData.projects?.items.map((project) => (
            <article className='project-card' key={project.id}>
              <div className='project-meta'>
                <span
                  className={`project-status ${getStatusTone(project.status)}`}
                >
                  {project.status.replace('-', ' ')}
                </span>
                <span className='project-updated'>
                  Updated {new Date(project.updatedAt).toLocaleString()}
                </span>
              </div>
              <h3 className='project-name'>{project.name}</h3>
              <p className='project-summary'>{project.summary}</p>
              <div className='stack-list'>
                {project.stack.map((item) => (
                  <span className='stack-chip' key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}

          {!loaderData.projects && (
            <article className='project-card project-card-empty'>
              <h3 className='project-name'>Project data unavailable</h3>
              <p className='project-summary'>
                The SSR route could not load `GET /api/projects`. Check that the
                Nest app is running and `API_URL` points at the right host.
              </p>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
