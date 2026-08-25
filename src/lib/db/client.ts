import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getEnvVar(key: string): string {
  // Vite client-side
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key] || '';
  }
  // Node.js server-side
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || '';
  }
  return '';
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY');

let clientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return clientInstance;
}

export const supabase = getSupabase();

export async function getCurrentAuthUserId(): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data } = await client.auth.getUser();
    return data?.user?.id || null;
  } catch (err) {
    return null;
  }
}

export function isGuestId(id?: string | null): boolean {
  if (!id) return true;
  const lower = String(id).toLowerCase();
  return lower === 'guest' || lower === 'guest_citizen' || lower.includes('guest');
}

export async function resolveEffectiveCitizenId(preferredId?: string): Promise<string | null> {
  if (preferredId && isValidUUID(preferredId) && !isGuestId(preferredId)) {
    return preferredId;
  }
  return getCurrentAuthUserId();
}

export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
}> {
  const client = getSupabase();
  if (!client) {
    return {
      connected: false,
      message: 'Supabase environment variables missing (VITE_SUPABASE_URL)',
    };
  }

  try {
    const { error } = await client.from('profiles').select('id', { head: true, count: 'exact' });
    if (error && error.code !== 'PGRST116' && !error.message.includes('relation "public.profiles" does not exist')) {
      return { connected: true, message: `Connected to Supabase (${error.message})` };
    }
    return { connected: true, message: 'Supabase client connected successfully' };
  } catch (err: any) {
    return { connected: false, message: err?.message || 'Failed to connect to Supabase' };
  }
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isValidUUID(str: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function toValidUUID(id: string): string {
  if (!id) return generateUUID();
  if (isValidUUID(id)) return id;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hex1 = Math.abs(hash).toString(16).padStart(8, '0');
  const hex2 = Math.abs(hash * 31).toString(16).padStart(8, '0');
  const hex3 = Math.abs(hash * 127).toString(16).padStart(8, '0');
  const hex4 = Math.abs(hash * 8191).toString(16).padStart(8, '0');
  return `${hex1}-${hex2.slice(0, 4)}-4${hex2.slice(1, 4)}-a${hex3.slice(0, 3)}-${hex4.padStart(12, '0').slice(0, 12)}`;
}

export function sanitizeCategory(cat?: string): 'property' | 'tenant' | 'family' | 'consumer' | 'labour' | 'other' {
  if (!cat) return 'other';
  const lower = String(cat).toLowerCase();
  if (lower.includes('prop') || lower.includes('land') || lower.includes('makan') || lower.includes('plot') || lower.includes('registry')) return 'property';
  if (lower.includes('ten') || lower.includes('rent') || lower.includes('kiraya')) return 'tenant';
  if (lower.includes('fam') || lower.includes('divor') || lower.includes('marriage') || lower.includes('custody')) return 'family';
  if (lower.includes('consu') || lower.includes('fraud') || lower.includes('refund')) return 'consumer';
  if (lower.includes('lab') || lower.includes('emp') || lower.includes('sal') || lower.includes('job')) return 'labour';
  return 'other';
}

export async function ensureProfileRowExists(client: SupabaseClient, dbProfileId: string): Promise<string> {
  if (!isValidUUID(dbProfileId)) return 'a092814b-0e43-4001-9f83-138e22a52df1';
  try {
    const { data } = await client.from('profiles').select('id').eq('id', dbProfileId).maybeSingle();
    if (data?.id) return data.id;

    await client.from('profiles').upsert(
      {
        id: dbProfileId,
        full_name: 'Aapka Naam',
        user_type: 'citizen',
        preferred_language: 'hindi',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    return dbProfileId;
  } catch (err) {
    console.warn('ensureProfileRowExists notice:', err);
    return dbProfileId;
  }
}

export async function ensureCaseRowExists(
  client: SupabaseClient,
  dbCaseId: string,
  dbCitizenId: string
): Promise<string> {
  if (!isValidUUID(dbCaseId)) return dbCaseId;
  try {
    const { data } = await client.from('cases').select('id').eq('id', dbCaseId).maybeSingle();
    if (data?.id) return data.id;

    const validCitizenId = await ensureProfileRowExists(client, dbCitizenId);
    await client.from('cases').insert({
      id: dbCaseId,
      citizen_id: validCitizenId,
      title: 'Naya Legal Query',
      category: 'other',
      status: 'ongoing',
      ai_verdict: 'needs_more_info',
      confidence_score: 0.5,
    });
    return dbCaseId;
  } catch (err) {
    console.warn('ensureCaseRowExists notice:', err);
    return dbCaseId;
  }
}

export async function resolveValidProfileId(client: SupabaseClient, preferredId?: string): Promise<string> {
  if (preferredId && isValidUUID(preferredId) && !isGuestId(preferredId)) {
    const validId = await ensureProfileRowExists(client, preferredId);
    if (validId) return validId;
  }
  const authId = await getCurrentAuthUserId();
  if (authId) return authId;

  const { data: firstCitizen } = await client.from('profiles').select('id').eq('user_type', 'citizen').limit(1).maybeSingle();
  if (firstCitizen?.id) return firstCitizen.id;

  return 'a092814b-0e43-4001-9f83-138e22a52df1';
}

export async function resolveValidLawyerId(client: SupabaseClient, preferredId?: string): Promise<string> {
  if (preferredId) {
    const dbId = toValidUUID(preferredId);
    const { data } = await client.from('lawyers').select('id').eq('id', dbId).maybeSingle();
    if (data?.id) return data.id;
  }
  const { data: firstLawyer } = await client.from('lawyers').select('id').limit(1).maybeSingle();
  if (firstLawyer?.id) return firstLawyer.id;

  return '703b8131-cf1f-47ee-8f4a-cda657989c4f';
}

export async function resolveValidCaseId(client: SupabaseClient, preferredCaseId: string, citizenId: string): Promise<string> {
  const dbCaseId = toValidUUID(preferredCaseId);
  const { data } = await client.from('cases').select('id').eq('id', dbCaseId).maybeSingle();
  if (data?.id) return data.id;

  const validCitizenId = await resolveValidProfileId(client, citizenId);
  const { data: newCase, error } = await client
    .from('cases')
    .insert({
      id: dbCaseId,
      citizen_id: validCitizenId,
      title: 'Legal Consultation Request',
      category: 'property',
      status: 'ongoing',
    })
    .select('id')
    .maybeSingle();

  if (!error && newCase?.id) return newCase.id;

  return dbCaseId;
}
