import { Form, Link, useActionData, useNavigation, useSearchParams } from 'react-router';
import { authFetch } from '~/lib/auth-api.server';
import type { Route } from './+types/reset-password';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) return { valid: false };
  return { valid: true };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const token = formData.get('token') as string;
  const password = formData.get('password') as string;

  const result = await authFetch<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
  });

  if (!result.ok) return { error: result.error, success: false };
  return { error: null, success: true };
}

export function meta() {
  return [{ title: 'Reset Password — Monorepo' }];
}

export default function ResetPasswordPage({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const isSubmitting = navigation.state === 'submitting';

  if (!loaderData.valid) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <div className="auth-header">
            <span className="eyebrow">Password reset</span>
            <h1 className="auth-title">Invalid link.</h1>
          </div>
          <p className="auth-error">Missing reset token. Please request a new reset link.</p>
          <p className="auth-switch" style={{ marginTop: '1.5rem' }}>
            <Link to="/auth/forgot-password" className="auth-link">Request new link</Link>
          </p>
        </div>
      </main>
    );
  }

  if (actionData?.success) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <div className="auth-header">
            <span className="eyebrow">Password reset</span>
            <h1 className="auth-title">Done.</h1>
          </div>
          <p className="queue-message is-success">
            Password has been reset. You can now sign in with your new password.
          </p>
          <p className="auth-switch" style={{ marginTop: '1.5rem' }}>
            <Link to="/auth" className="auth-link">Sign in</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <span className="eyebrow">Password reset</span>
          <h1 className="auth-title">New password.</h1>
        </div>

        <Form method="post" className="auth-form">
          <input type="hidden" name="token" value={token} />

          <div className="field">
            <label className="field-label" htmlFor="password">New password</label>
            <input
              className="field-input"
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="••••••••"
            />
          </div>

          {actionData?.error && (
            <p className="auth-error" role="alert">{actionData.error}</p>
          )}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Resetting…' : 'Reset password'}
          </button>
        </Form>

        <p className="auth-switch">
          <Link to="/auth" className="auth-link">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
