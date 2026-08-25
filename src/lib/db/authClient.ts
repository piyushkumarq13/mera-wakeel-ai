import { getSupabase } from './client';

/** Fetch the current access token from the persisted Supabase session. */
export async function getSessionToken(): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data } = await client.auth.getSession();
    return data?.session?.access_token || null;
  } catch (err) {
    return null;
  }
}

/**
 * Build headers for proxying authed requests to the Express backend.
 * Attaches `Authorization: Bearer <token>` whenever a session exists so the
 * server can verify the caller via `verifySupabaseSession`.
 */
export async function getAuthHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getSessionToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}