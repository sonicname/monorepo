const AUTH_SERVICE_URL =
  process.env['AUTH_SERVICE_URL'] ?? 'http://127.0.0.1:3002';

type AuthApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Make an authenticated request to the auth service */
export async function authFetch<T>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<AuthApiResult<T>> {
  const { method = 'GET', token, body } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${AUTH_SERVICE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(5000),
    });

    if (res.status === 204) {
      return { ok: true, data: undefined as T };
    }

    const json = await res.json();

    if (!res.ok) {
      const message = Array.isArray(json.message)
        ? json.message.join(', ')
        : json.message ?? json.error?.message ?? 'Request failed.';
      return { ok: false, error: message };
    }

    // Auth service wraps in { ok, data } envelope
    return { ok: true, data: (json.data ?? json) as T };
  } catch {
    return { ok: false, error: 'Could not reach the auth service.' };
  }
}
