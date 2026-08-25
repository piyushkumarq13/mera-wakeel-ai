import { CaseDeadline, DeadlineType } from '../../types/database';
import { getSupabase, isValidUUID, toValidUUID, generateUUID } from './client';
import { getAuthHeaders } from './authClient';

export async function fetchCaseDeadlines(citizenId: string): Promise<CaseDeadline[]> {
  try {
    const res = await fetch(`/api/db/deadlines?citizenId=${encodeURIComponent(citizenId)}`, { headers: await getAuthHeaders() });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.deadlines)) return json.deadlines;
    }
  } catch (err) {
    console.warn('fetchCaseDeadlines proxy notice:', err);
  }
  const client = getSupabase();
  if (client) {
    try {
      const ids = Array.from(new Set([citizenId, toValidUUID(citizenId)].filter(isValidUUID)));
      const { data } = await client
        .from('case_deadlines')
        .select('*, case:cases(id,title,status)')
        .in('citizen_id', ids)
        .order('due_date', { ascending: true });
      if (data) return data as CaseDeadline[];
    } catch (err) {
      console.warn('fetchCaseDeadlines client notice:', err);
    }
  }
  return [];
}

export async function addCaseDeadline(
  caseId: string,
  citizenId: string,
  deadlineType: DeadlineType,
  dueDate: string,
  notes?: string
): Promise<CaseDeadline | null> {
  try {
    const res = await fetch('/api/db/deadlines/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case_id: caseId,
        citizen_id: citizenId,
        deadline_type: deadlineType,
        due_date: dueDate,
        notes: notes || '',
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.deadline) return json.deadline as CaseDeadline;
    }
  } catch (err) {
    console.warn('addCaseDeadline proxy notice:', err);
  }
  const client = getSupabase();
  if (client) {
    try {
      const dbCaseId = toValidUUID(caseId);
      const dbCitizenId = toValidUUID(citizenId);
      const { data, error } = await client
        .from('case_deadlines')
        .insert({
          id: generateUUID(),
          case_id: dbCaseId,
          citizen_id: dbCitizenId,
          deadline_type: deadlineType,
          due_date: new Date(dueDate).toISOString(),
          notes: notes || null,
          reminder_sent: false,
        })
        .select('*')
        .single();
      if (!error && data) return data as CaseDeadline;
    } catch (err) {
      console.warn('addCaseDeadline client notice:', err);
    }
  }
  return null;
}

export async function deleteCaseDeadline(deadlineId: string): Promise<void> {
  try {
    await fetch(`/api/db/deadlines/${encodeURIComponent(deadlineId)}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('deleteCaseDeadline proxy notice:', err);
  }
  const client = getSupabase();
  if (client && isValidUUID(deadlineId)) {
    try {
      await client.from('case_deadlines').delete().eq('id', deadlineId);
    } catch (err) {
      console.warn('deleteCaseDeadline client notice:', err);
    }
  }
}
