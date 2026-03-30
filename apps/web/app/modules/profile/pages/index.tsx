import type { UserProfile } from '@monorepo/contracts';
import { Form, Link, useActionData, useNavigation } from 'react-router';
import { authFetch } from '~/lib/auth-api.server';
import { requireAuth } from '~/lib/session.server';
import type { Route } from './+types/index';

export async function loader({ request }: Route.LoaderArgs) {
  const token = await requireAuth(request);
  const result = await authFetch<UserProfile>('/auth/profile', { token });
  if (!result.ok) throw new Response(result.error, { status: 502 });
  return { profile: result.data };
}

export async function action({ request }: Route.ActionArgs) {
  const token = await requireAuth(request);
  const formData = await request.formData();

  const body: Record<string, string> = {};
  const displayName = formData.get('displayName') as string | null;
  const bio = formData.get('bio') as string | null;

  if (displayName !== null) body['displayName'] = displayName.trim();
  if (bio !== null) body['bio'] = bio.trim();

  const result = await authFetch<UserProfile>('/auth/profile', {
    method: 'PATCH',
    token,
    body,
  });

  if (!result.ok) return { error: result.error, success: false };
  return { error: null, success: true };
}

export function meta() {
  return [{ title: 'Profile — Monorepo' }];
}

export default function ProfilePage({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const { profile } = loaderData;

  return (
    <main className="auth-shell">
      <div className="profile-card">
        <div className="auth-header">
          <span className="eyebrow">Account</span>
          <h1 className="auth-title">Profile.</h1>
        </div>

        <div className="profile-info">
          <div className="detail-list">
            <div className="detail-item">
              <span className="detail-key">Email</span>
              <span className="detail-value">{profile.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-key">Username</span>
              <span className="detail-value">{profile.username}</span>
            </div>
            <div className="detail-item">
              <span className="detail-key">Role</span>
              <span className="detail-value">{profile.role}</span>
            </div>
            <div className="detail-item">
              <span className="detail-key">Email verified</span>
              <span className="detail-value">
                {profile.emailVerified ? (
                  <span className="status-pill is-ok" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>Verified</span>
                ) : (
                  <>
                    <span className="status-pill is-error" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>Not verified</span>
                    {' '}
                    <Link to="/auth/resend-verification" className="auth-link" style={{ fontSize: '0.85rem' }}>
                      Resend
                    </Link>
                  </>
                )}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-key">Member since</span>
              <span className="detail-value">
                {new Date(profile.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <Form method="post" className="auth-form" style={{ marginTop: '1.5rem' }}>
          <div className="field">
            <label className="field-label" htmlFor="displayName">
              Display name
            </label>
            <input
              className="field-input"
              id="displayName"
              name="displayName"
              type="text"
              maxLength={100}
              defaultValue={profile.displayName ?? ''}
              placeholder="Your display name"
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="bio">Bio</label>
            <textarea
              className="field-input"
              id="bio"
              name="bio"
              maxLength={500}
              rows={3}
              defaultValue={profile.bio ?? ''}
              placeholder="Tell us about yourself"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {actionData?.error && (
            <p className="auth-error" role="alert">{actionData.error}</p>
          )}

          {actionData?.success && (
            <p className="queue-message is-success">Profile updated.</p>
          )}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </button>
        </Form>

        <p className="auth-switch">
          <Link to="/" className="auth-link">Back to home</Link>
        </p>
      </div>
    </main>
  );
}
