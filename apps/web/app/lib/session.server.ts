import { createCookieSessionStorage, redirect } from 'react-router';
import type { UserRole } from '@monorepo/contracts';

type SessionUser = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
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

export async function requireUser(request: Request): Promise<SessionUser> {
  const session = await getSession(request.headers.get('Cookie'));
  const user = session.get('user') as SessionUser | undefined;
  if (!user) throw redirect('/auth');
  return user;
}

export async function requireRole(request: Request, ...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser(request);
  if (!roles.includes(user.role)) {
    throw new Response('Forbidden', { status: 403 });
  }
  return user;
}

export async function getSessionUser(
  request: Request,
): Promise<SessionUser | null> {
  const session = await getSession(request.headers.get('Cookie'));
  return (session.get('user') as SessionUser | undefined) ?? null;
}
