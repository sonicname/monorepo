import { Form, Link, useActionData, useNavigation } from 'react-router';
import { authFetch } from '~/lib/auth-api.server';
import type { Route } from './+types/forgot-password';

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = (formData.get('email') as string).trim();

  const result = await authFetch<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });

  if (!result.ok) return { error: result.error, sent: false };
  return { error: null, sent: true };
}

export function meta() {
  return [{ title: 'Forgot Password — Monorepo' }];
}

export default function ForgotPasswordPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <span className="eyebrow">Password recovery</span>
          <h1 className="auth-title">Forgot password.</h1>
        </div>

        {actionData?.sent ? (
          <>
            <p className="queue-message is-success">
              If that email exists, a reset link has been sent. Check your inbox.
            </p>
            <p className="auth-switch" style={{ marginTop: '1.5rem' }}>
              <Link to="/auth" className="auth-link">Back to sign in</Link>
            </p>
          </>
        ) : (
          <>
            <Form method="post" className="auth-form">
              <div className="field">
                <label className="field-label" htmlFor="email">Email</label>
                <input
                  className="field-input"
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </div>

              {actionData?.error && (
                <p className="auth-error" role="alert">{actionData.error}</p>
              )}

              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </button>
            </Form>

            <p className="auth-switch">
              <Link to="/auth" className="auth-link">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
