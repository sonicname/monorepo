import { createCookieSessionStorage, redirect } from 'react-router';

type SessionUser = {
  id: string;
  email: string;
  username: string;
  createdAt: string;
};

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__auth',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secrets: [process.env['SESSION_SECRET'] ?? 'change-me-in-production'],
    secure: process.env['NODE_ENV'] === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;

export async function requireAuth(request: Request): Promise<string> {
  const session = await getSession(request.headers.get('Cookie'));
  const token = session.get('token') as string | undefined;
  if (!token) throw redirect('/auth');
  return token;
}

export async function getSessionUser(
  request: Request,
): Promise<SessionUser | null> {
  const session = await getSession(request.headers.get('Cookie'));
  return (session.get('user') as SessionUser | undefined) ?? null;
}
