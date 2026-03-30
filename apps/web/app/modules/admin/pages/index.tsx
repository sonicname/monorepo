import { requireRole } from '~/lib/session.server';
import type { Route } from './+types/index';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireRole(request, 'admin');
  return { user };
}

export function meta() {
  return [{ title: 'Admin — Monorepo' }];
}

export default function AdminPage({ loaderData }: Route.ComponentProps) {
  return (
    <main className="status-shell">
      <section className="status-grid">
        <div className="hero-card">
          <span className="eyebrow">Admin panel</span>
          <h1 className="hero-title">Administration</h1>
          <p className="hero-copy">
            Logged in as {loaderData.user.username} ({loaderData.user.role})
          </p>
        </div>
      </section>
    </main>
  );
}
