import { Profile } from '../../types/database';
import { getSupabase, isValidUUID, toValidUUID } from './client';
import { getAuthHeaders } from './authClient';

export interface DisplayNameInput {
  profile?: Pick<Profile, 'full_name' | 'phone'> | null;
  metadata?: Record<string, any> | null;
  email?: string | null;
  phone?: string | null;
  role?: 'citizen' | 'lawyer' | 'admin';
}

function looksLikePlaceholder(name: string): boolean {
  const lower = String(name).toLowerCase().trim();
  return (
    !lower ||
    lower === 'aapka naam' ||
    lower === 'your name' ||
    lower === 'guest citizen' ||
    lower === 'citizen user' ||
    lower === 'user' ||
    lower === 'citizen' ||
    lower === 'advocate'
  );
}

export function resolveDisplayName(input: DisplayNameInput): string {
  const rawName =
    input.profile?.full_name ||
    input.metadata?.full_name ||
    input.metadata?.name ||
    input.metadata?.user_name ||
    '';

  const cleanName = String(rawName ?? '').trim();
  if (cleanName && !looksLikePlaceholder(cleanName)) return cleanName;

  // Fallback 1: derive a proper name from the email local-part instead of
  // dumping the raw prefix in uppercase (e.g. "CITIZEN123" in the navbar).
  const email = (input.email || '').trim();
  if (email.includes('@')) {
    const localPart = email.split('@')[0].replace(/[\d._\-+]+$/g, '').trim();
    if (localPart) {
      return localPart
        .split(/[._\-+]/)
        .filter((w) => w.trim())
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }

  // Fallback 2: phone number is more personal than a generic role label.
  const phone = input.phone || input.profile?.phone || '';
  if (String(phone).trim()) return String(phone).trim();

  // Fallback 3: role-based label.
  return input.role === 'lawyer' ? 'Advocate' : 'Citizen';
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!userId) return null;

  try {
    const res = await fetch(`/api/db/profile?userId=${encodeURIComponent(userId)}`, {
      headers: await getAuthHeaders(),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.profile) {
        return json.profile as Profile;
      }
    }
  } catch (err) {
    console.warn('fetchProfile proxy notice:', err);
  }

  const client = getSupabase();
  if (!client) return null;

  const dbUserId = toValidUUID(userId);
  const targetIds = Array.from(
    new Set([userId, dbUserId].filter((x) => Boolean(x) && isValidUUID(x)))
  );

  if (targetIds.length === 0) return null;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .in('id', targetIds)
      .maybeSingle();

    if (error) {
      console.warn('Supabase profile fetch:', error.message);
      return null;
    }
    return data as Profile | null;
  } catch (err) {
    console.error('Error fetching profile from Supabase:', err);
    return null;
  }
}

export async function createOrUpdateProfile(profileData: Partial<Profile> & { id: string }): Promise<Profile | null> {
  const formattedProfile: Profile = {
    id: profileData.id,
    full_name: profileData.full_name || null,
    phone: profileData.phone || null,
    user_type: profileData.user_type || 'citizen',
    preferred_language: profileData.preferred_language || 'hindi',
    city: profileData.city || null,
    state: profileData.state || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const res = await fetch('/api/db/profile/save', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(formattedProfile),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.profile) {
        return json.profile as Profile;
      }
    }
  } catch (err) {
    console.warn('createOrUpdateProfile proxy notice:', err);
  }

  const client = getSupabase();
  if (!client) return formattedProfile;

  try {
    const { data, error } = await client
      .from('profiles')
      .upsert(formattedProfile, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      console.error('Supabase profile upsert error:', error.message);
      return formattedProfile;
    }
    return data as Profile;
  } catch (err) {
    console.error('createOrUpdateProfile error:', err);
    return formattedProfile;
  }
}
