import { Link, useLoaderData } from 'react-router';
import { authFetch } from '~/lib/auth-api.server';
import type { Route } from './+types/verify-email';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return { success: false, error: 'Missing verification token.' };
  }

  const result = await authFetch<{ message: string }>('/auth/verify-email', {
    method: 'POST',
    body: { token },
  });

  if (!result.ok) return { success: false, error: result.error };
  return { success: true, error: null };
}

export function meta() {
  return [{ title: 'Verify Email — Monorepo' }];
}

export default function VerifyEmailPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <span className="eyebrow">Email verification</span>
          <h1 className="auth-title">
            {data.success ? 'Verified.' : 'Failed.'}
          </h1>
        </div>

        {data.success ? (
          <p className="queue-message is-success">
            Your email has been verified successfully.
          </p>
        ) : (
          <p className="auth-error" role="alert">{data.error}</p>
        )}

        <p className="auth-switch" style={{ marginTop: '1.5rem' }}>
          <Link to="/auth" className="auth-link">Sign in</Link>
          {' · '}
          <Link to="/" className="auth-link">Home</Link>
        </p>
      </div>
    </main>
  );
}
