import type { ApiHealth } from '@monorepo/contracts';
import type { Route } from './+types/home';

function getApiBaseUrl() {
  return process.env.API_URL ?? 'http://127.0.0.1:3001';
}

export async function loader() {
  const apiBaseUrl = getApiBaseUrl();

  try {
    const response = await fetch(`${apiBaseUrl}/health`, {
      headers: {
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    const health = (await response.json()) as ApiHealth;

    return {
      apiBaseUrl,
      health,
      isHealthy: true,
      checkedAt: new Date().toISOString(),
      error: null,
    };
  } catch (error) {
    return {
      apiBaseUrl,
      health: null,
      isHealthy: false,
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown API error',
    };
  }
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
                  <span className='detail-key'>Message</span>
                  <span className='detail-value'>
                    {loaderData.health?.message ?? loaderData.error}
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
              <span className='detail-value'>
                {loaderData.apiBaseUrl}/health
              </span>
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
          </div>

          <div className='endpoint-list'>
            <div className='endpoint-chip'>
              <span className='endpoint-method'>GET</span>
              <span>{loaderData.apiBaseUrl}/health</span>
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
    </main>
  );
}
