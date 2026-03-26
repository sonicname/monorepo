import { Form, Link, redirect, useActionData, useNavigation, useSearchParams } from 'react-router';
import { commitSession, getSession } from '../lib/session.server';
import type { Route } from './+types/auth';

const AUTH_SERVICE_URL =
  process.env['AUTH_SERVICE_URL'] ?? 'http://127.0.0.1:3002';

type AuthApiResponse = {
  accessToken: string;
  user: { id: string; email: string; username: string; role: string; createdAt: string };
};

type AuthApiError = {
  message: string | string[];
  statusCode: number;
};

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  if (session.get('token')) throw redirect('/');
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const url = new URL(request.url);
  const mode =
    url.searchParams.get('mode') === 'register' ? 'register' : 'login';
  const formData = await request.formData();

  const email = (formData.get('email') as string).trim();
  const password = formData.get('password') as string;
  const username = (formData.get('username') as string | null)?.trim();

  const endpoint =
    mode === 'register' ? '/api/auth/register' : '/api/auth/login';
  const body: Record<string, string> = { email, password };
  if (mode === 'register' && username) body['username'] = username;

  let data: AuthApiResponse;

  try {
    const res = await fetch(`${AUTH_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({
        message: 'Authentication failed.',
      }))) as AuthApiError;
      const message = Array.isArray(err.message)
        ? err.message.join(', ')
        : (err.message ?? 'Authentication failed.');
      return { error: message };
    }

    data = (await res.json()) as AuthApiResponse;
  } catch {
    return { error: 'Could not reach the auth service. Is it running?' };
  }

  const session = await getSession(request.headers.get('Cookie'));
  session.set('token', data.accessToken);
  session.set('user', data.user);

  throw redirect('/', {
    headers: { 'Set-Cookie': await commitSession(session) },
  });
}

export function meta() {
  return [{ title: 'Sign in — Monorepo' }];
}

export default function AuthPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();

  const mode =
    searchParams.get('mode') === 'register' ? 'register' : 'login';
  const isRegister = mode === 'register';
  const isSubmitting = navigation.state === 'submitting';

  return (
    <main className='auth-shell'>
      <div className='auth-card'>
        <div className='auth-header'>
          <span className='eyebrow'>
            {isRegister ? 'Create account' : 'Welcome back'}
          </span>
          <h1 className='auth-title'>{isRegister ? 'Sign up.' : 'Sign in.'}</h1>
        </div>

        <Form method='post' className='auth-form' key={mode}>
          {isRegister && (
            <div className='field'>
              <label className='field-label' htmlFor='username'>
                Username
              </label>
              <input
                className='field-input'
                id='username'
                name='username'
                type='text'
                autoComplete='username'
                minLength={3}
                required
                placeholder='yourname'
              />
            </div>
          )}

          <div className='field'>
            <label className='field-label' htmlFor='email'>
              Email
            </label>
            <input
              className='field-input'
              id='email'
              name='email'
              type='email'
              autoComplete='email'
              required
              placeholder='you@example.com'
            />
          </div>

          <div className='field'>
            <label className='field-label' htmlFor='password'>
              Password
            </label>
            <input
              className='field-input'
              id='password'
              name='password'
              type='password'
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={8}
              required
              placeholder='••••••••'
            />
          </div>

          {actionData?.error && (
            <p className='auth-error' role='alert'>
              {actionData.error}
            </p>
          )}

          <button className='auth-submit' type='submit' disabled={isSubmitting}>
            {isSubmitting
              ? isRegister
                ? 'Creating account…'
                : 'Signing in…'
              : isRegister
                ? 'Create account'
                : 'Sign in'}
          </button>
        </Form>

        <p className='auth-switch'>
          {isRegister ? (
            <>
              Already have an account?{' '}
              <Link to='/auth' className='auth-link'>
                Sign in
              </Link>
            </>
          ) : (
            <>
              No account?{' '}
              <Link to='/auth?mode=register' className='auth-link'>
                Create one
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
