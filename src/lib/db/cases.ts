import { Case, CaseStatus, CaseEvidence, EvidencePriority, CaseFact, ProfileFact, Document, DocumentType } from '../../types/database';
import { detectLanguage } from '../language';
import { getSupabase, generateUUID, isValidUUID, toValidUUID, resolveEffectiveCitizenId, sanitizeCategory, ensureProfileRowExists, ensureCaseRowExists } from './client';
import { getAuthHeaders } from './authClient';

export async function fetchUserCases(citizenId?: string): Promise<Case[]> {
  const targetId = citizenId || 'guest_citizen';

  try {
    const res = await fetch(`/api/db/cases?citizenId=${encodeURIComponent(targetId)}`, { headers: await getAuthHeaders() });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.cases) && json.cases.length > 0) {
        return json.cases as Case[];
      }
    }
  } catch (err) {
    console.warn('fetchUserCases proxy notice:', err);
  }

  const client = getSupabase();
  const dbCitizenId = toValidUUID(targetId);

  const targetIds = Array.from(
    new Set([
      targetId,
      dbCitizenId,
      'cfabc5e6-1924-451e-8cc7-afc493f4e239',
      'guest_citizen',
    ].filter((x) => Boolean(x) && isValidUUID(x)))
  );

  if (client) {
    try {
      const { data, error } = await client
        .from('cases')
        .select('*')
        .in('citizen_id', targetIds)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return (data as Case[]) || [];
      }
    } catch (err) {
      console.warn('fetchUserCases client notice:', err);
    }
  }

  return [];
}

export const ACTIVE_CASE_LIMIT = 2;

const ACTIVE_CASE_STATUSES = new Set(['ongoing', 'assessed', 'lawyer_connected']);

function countActiveCases(cases: Case[]): number {
  return cases.filter((c) => ACTIVE_CASE_STATUSES.has(c.status)).length;
}

export async function createCase(
  citizenId: string,
  title: string = 'Naya Legal Query',
  category: any = 'other',
  opts?: { reuseActive?: boolean; citizenNote?: string; skipCapCheck?: boolean }
): Promise<Case> {
  const effectiveCitizenId = (await resolveEffectiveCitizenId(citizenId)) || citizenId;
  const dbCitizenId = toValidUUID(effectiveCitizenId);
  const caseId = generateUUID();
  const safeCategory = sanitizeCategory(category);
  const reuseActive = opts?.reuseActive ?? false;
  const citizenNote = opts?.citizenNote || null;
  const skipCapCheck = opts?.skipCapCheck ?? false;

  let existingCases: Case[] = [];
  try {
    existingCases = (await fetchUserCases(citizenId)) || [];
  } catch (err) {
    console.warn('fetchUserCases for cap check notice:', err);
  }

  const activeCount = countActiveCases(existingCases);

  if (reuseActive) {
    const activeCase = existingCases.find((c) => ACTIVE_CASE_STATUSES.has(c.status));
    if (activeCase) {
      console.log('Active case already exists, reusing active case:', activeCase.id);
      return activeCase;
    }
  }

  if (!skipCapCheck && activeCount >= ACTIVE_CASE_LIMIT) {
    throw new Error('ACTIVE_CASE_LIMIT_REACHED');
  }

  const newCase: Case = {
    id: caseId,
    citizen_id: dbCitizenId,
    title,
    category: safeCategory,
    status: 'ongoing',
    ai_verdict: 'needs_more_info',
    ai_summary: null,
    confidence_score: 0.5,
    assigned_lawyer_id: null,
    citizen_note: citizenNote,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const res = await fetch('/api/db/cases/save', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        id: caseId,
        citizen_id: citizenId,
        title,
        category: safeCategory,
        status: 'ongoing',
        citizen_note: citizenNote,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.case) return json.case;
    }
  } catch (err) {
    console.warn('createCase proxy notice:', err);
  }

  const client = getSupabase();
  if (client) {
    try {
      const validCitizenId = await ensureProfileRowExists(client, dbCitizenId);

      const insertPayload: any = {
        id: caseId,
        citizen_id: validCitizenId,
        title,
        category: safeCategory,
        status: 'ongoing',
        ai_verdict: 'needs_more_info',
        ai_summary: null,
        confidence_score: 0.5,
      };
      if (citizenNote) insertPayload.citizen_note = citizenNote;

      let { data, error } = await client
        .from('cases')
        .insert(insertPayload)
        .select('*')
        .maybeSingle();

      if (error && citizenNote && (error.message?.includes('citizen_note') || error.message?.includes('column') || (error as any).code === '42703')) {
        delete insertPayload.citizen_note;
        const retry = await client.from('cases').insert(insertPayload).select('*').maybeSingle();
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        return data as Case;
      }
    } catch (err) {
      console.warn('createCase client notice:', err);
    }
  }

  return newCase;
}

export async function fetchCaseMessages(caseId: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/db/messages?caseId=${encodeURIComponent(caseId)}`, { headers: await getAuthHeaders() });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.messages)) {
        return json.messages;
      }
    }
  } catch (err) {
    console.warn('fetchCaseMessages proxy notice:', err);
  }

  const client = getSupabase();
  const dbCaseId = toValidUUID(caseId);
  const targetIds = Array.from(
    new Set([caseId, dbCaseId].filter((x) => Boolean(x) && isValidUUID(x)))
  );

  if (client && targetIds.length > 0) {
    try {
      const { data, error } = await client
        .from('messages')
        .select('*')
        .in('case_id', targetIds)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('fetchCaseMessages client notice:', err);
    }
  }

  return [];
}

export async function saveCaseMessage(
  caseId: string,
  senderType: 'user' | 'ai',
  content: string,
  messageType: 'text' | 'voice' | 'document_reference' = 'text',
  citizenId?: string,
  detectedLanguage?: string
): Promise<any> {
  const dbCaseId = toValidUUID(caseId);
  const effectiveCitizenId = (await resolveEffectiveCitizenId(citizenId)) || citizenId || 'guest_citizen';
  const dbCitizenId = toValidUUID(effectiveCitizenId);
  const language = detectedLanguage || detectLanguage(String(content).trim());
  const msgObj = {
    id: generateUUID(),
    case_id: dbCaseId,
    sender_type: senderType,
    content: content.trim(),
    message_type: messageType,
    language,
    created_at: new Date().toISOString(),
  };

  try {
    const res = await fetch('/api/db/messages/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case_id: caseId,
        sender_type: senderType,
        content: content.trim(),
        message_type: messageType,
        citizen_id: citizenId || 'guest_citizen',
        language,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.message) {
        return json.message;
      }
    }
  } catch (err) {
    console.warn('saveCaseMessage proxy notice:', err);
  }

  const client = getSupabase();
  if (client) {
    try {
      await ensureCaseRowExists(client, dbCaseId, dbCitizenId);

      const { data, error } = await client
        .from('messages')
        .insert({
          id: msgObj.id,
          case_id: dbCaseId,
          sender_type: senderType,
          content: content.trim(),
          message_type: messageType,
          language,
        })
        .select('*')
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('saveCaseMessage client db notice:', err);
    }
  }

  return msgObj;
}

export async function fetchCaseById(caseId: string): Promise<Case | null> {
  try {
    const res = await fetch(`/api/db/cases?caseId=${encodeURIComponent(caseId)}`, { headers: await getAuthHeaders() });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.cases)) {
        const found = json.cases.find((c: any) => c.id === caseId || c.id === toValidUUID(caseId));
        if (found) return found as Case;
      }
    }
  } catch (err) {
    console.warn('fetchCaseById proxy notice:', err);
  }

  const client = getSupabase();
  if (!client || !caseId) return null;

  const dbCaseId = toValidUUID(caseId);
  const targetIds = Array.from(
    new Set([caseId, dbCaseId].filter((x) => Boolean(x) && isValidUUID(x)))
  );

  if (targetIds.length === 0) return null;

  try {
    const { data, error } = await client
      .from('cases')
      .select('*')
      .in('id', targetIds)
      .maybeSingle();

    if (!error && data) {
      return data as Case;
    }
  } catch (err) {
    console.warn('fetchCaseById exception:', err);
  }

  return null;
}

export async function incrementLawyerCasesHandled(lawyerId: string): Promise<number> {
  const client = getSupabase();
  if (client) {
    try {
      const { data } = await client
        .from('lawyers')
        .select('total_cases_handled')
        .or(`id.eq.${lawyerId},profile_id.eq.${lawyerId}`)
        .maybeSingle();

      const current = data?.total_cases_handled || 0;
      const updated = current + 1;
      await client
        .from('lawyers')
        .update({ total_cases_handled: updated })
        .or(`id.eq.${lawyerId},profile_id.eq.${lawyerId}`);

      return updated;
    } catch (e) {
      console.warn('incrementLawyerCasesHandled db notice:', e);
    }
  }
  return 0;
}

export async function updateCaseStatus(
  caseId: string,
  citizenId: string,
  status: CaseStatus
): Promise<void> {
  const client = getSupabase();

  try {
    await fetch('/api/db/cases/status', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ caseId, status }),
    });
  } catch (err) {
    console.warn('updateCaseStatus proxy notice:', err);
  }

  if (client && isValidUUID(caseId)) {
    try {
      const { data: caseData } = await client
        .from('cases')
        .select('assigned_lawyer_id, status')
        .eq('id', caseId)
        .maybeSingle();

      await client
        .from('cases')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseId);

      if (status === 'closed' && caseData && caseData.status !== 'closed' && caseData.assigned_lawyer_id) {
        await incrementLawyerCasesHandled(caseData.assigned_lawyer_id);
      }
    } catch (err) {
      console.warn('updateCaseStatus error:', err);
    }
  }
}

export function inferCaseCategory(text: string): 'property' | 'tenant' | 'family' | 'consumer' | 'labour' | 'other' {
  const lower = text.toLowerCase();
  if (
    lower.includes('property') || lower.includes('zameen') || lower.includes('land') ||
    lower.includes('plot') || lower.includes('registry') || lower.includes('stamp') ||
    lower.includes('dakhil') || lower.includes('kabza') || lower.includes('encroach') ||
    lower.includes('builder') || lower.includes('flat') || lower.includes('sale deed') || lower.includes('partition')
  ) {
    return 'property';
  }
  if (
    lower.includes('kiraya') || lower.includes('rent') || lower.includes('tenant') ||
    lower.includes('landlord') || lower.includes('makan malik') || lower.includes('kirayedar') ||
    lower.includes('deposit') || lower.includes('evict')
  ) {
    return 'tenant';
  }
  if (
    lower.includes('divorce') || lower.includes('custody') || lower.includes('maintenance') ||
    lower.includes('matrimonial') || lower.includes('husband') || lower.includes('wife') ||
    lower.includes('dowry') || lower.includes('shadi') || lower.includes('talaq') || lower.includes('family')
  ) {
    return 'family';
  }
  if (
    lower.includes('consumer') || lower.includes('refund') || lower.includes('product') ||
    lower.includes('defective') || lower.includes('fraud') || lower.includes('warranty') || lower.includes('order')
  ) {
    return 'consumer';
  }
  if (
    lower.includes('salary') || lower.includes('job') || lower.includes('terminat') ||
    lower.includes('resign') || lower.includes('employer') || lower.includes('employee') ||
    lower.includes('labor') || lower.includes('labour') || lower.includes('majdoori') || lower.includes('pf')
  ) {
    return 'labour';
  }
  return 'other';
}

export async function updateCaseVerdictAndSummary(
  caseId: string,
  verdict: 'user_correct' | 'user_incorrect' | 'needs_more_info',
  summary: string,
  confidenceScore: number = 0.85,
  title?: string,
  citizenId?: string,
  category?: string
): Promise<void> {
  const client = getSupabase();

  try {
    await fetch('/api/db/cases/status', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        caseId,
        ai_verdict: verdict,
        ai_summary: summary,
        confidence_score: confidenceScore,
      }),
    });
  } catch (err) {
    console.warn('updateCaseVerdictAndSummary proxy notice:', err);
  }

  if (client && isValidUUID(caseId)) {
    try {
      const updatePayload: any = {
        ai_verdict: verdict,
        ai_summary: summary,
        confidence_score: confidenceScore,
        updated_at: new Date().toISOString(),
      };
      if (title) updatePayload.title = title;
      if (category) updatePayload.category = category;

      await client.from('cases').update(updatePayload).eq('id', caseId);
    } catch (err) {
      console.error('updateCaseVerdictAndSummary error:', err);
    }
  }
}

export async function fetchCaseEvidence(caseId: string): Promise<CaseEvidence[]> {
  const client = getSupabase();
  const dbCaseId = toValidUUID(caseId);
  const targetIds = Array.from(
    new Set([caseId, dbCaseId].filter((x) => Boolean(x) && isValidUUID(x)))
  );

  if (client && targetIds.length > 0) {
    try {
      const { data, error } = await client
        .from('case_evidence')
        .select('*')
        .in('case_id', targetIds)
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        return (data as CaseEvidence[]) || [];
      }
    } catch (err) {
      console.warn('fetchCaseEvidence client notice:', err);
    }
  }

  try {
    const res = await fetch(`/api/db/evidence?caseId=${encodeURIComponent(caseId)}`, { headers: await getAuthHeaders() });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.evidence)) {
        return json.evidence;
      }
    }
  } catch (err) {
    console.warn('fetchCaseEvidence proxy notice:', err);
  }

  return [];
}

export async function addCaseEvidence(
  caseId: string,
  description: string,
  priority: EvidencePriority = 'critical',
  citizenId?: string
): Promise<CaseEvidence> {
  const cleanDesc = description.trim();
  const evId = generateUUID();
  const newEv: CaseEvidence = {
    id: evId,
    case_id: caseId,
    evidence_description: cleanDesc,
    is_available: false,
    priority,
  };

  try {
    const res = await fetch('/api/db/evidence/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case_id: caseId,
        title: cleanDesc,
        description: cleanDesc,
        priority,
        citizen_id: citizenId || 'guest_citizen',
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.evidence) return json.evidence;
    }
  } catch (err) {
    console.warn('addCaseEvidence proxy notice:', err);
  }

  const client = getSupabase();
  if (client && isValidUUID(caseId)) {
    try {
      const { data, error } = await client
        .from('case_evidence')
        .insert({
          id: evId,
          case_id: caseId,
          evidence_description: cleanDesc,
          is_available: false,
          priority,
        })
        .select('*')
        .single();

      if (!error && data) {
        return data as CaseEvidence;
      }
    } catch (err) {
      console.warn('addCaseEvidence client exception:', err);
    }
  }

  return newEv;
}

export async function toggleEvidenceAvailable(
  evidenceId: string,
  caseId: string,
  isAvailable: boolean
): Promise<void> {
  const client = getSupabase();
  if (client && isValidUUID(caseId)) {
    try {
      await client
        .from('case_evidence')
        .update({ is_available: isAvailable })
        .eq('id', evidenceId);
    } catch (err) {
      console.warn('toggleEvidenceAvailable error:', err);
    }
  }
}

export async function saveExtractedEvidence(
  caseId: string,
  rawAiText: string
): Promise<{
  cleanedText: string;
  extractedEvidences: Array<{ description: string; priority: EvidencePriority }>;
}> {
  let cleanedText = rawAiText;
  const extractedEvidences: Array<{ description: string; priority: EvidencePriority }> = [];

  const evRegex = /\[\[EVIDENCE:\s*(.*?)(?:\s*\|\s*(critical|helpful|optional))?\s*\]\]/gi;
  let match;

  while ((match = evRegex.exec(rawAiText)) !== null) {
    const description = match[1]?.trim();
    const rawPriority = match[2]?.trim().toLowerCase();
    const priority: EvidencePriority =
      rawPriority === 'critical' ? 'critical' : rawPriority === 'helpful' ? 'helpful' : 'optional';

    if (description) {
      extractedEvidences.push({ description, priority });
      if (caseId) {
        await addCaseEvidence(caseId, description, priority);
      }
    }
  }

  cleanedText = cleanedText.replace(evRegex, '').trim();

  return { cleanedText, extractedEvidences };
}

export async function fetchCaseFacts(caseId: string): Promise<CaseFact[]> {
  const client = getSupabase();
  const dbCaseId = toValidUUID(caseId);
  const targetIds = Array.from(
    new Set([caseId, dbCaseId].filter((x) => Boolean(x) && isValidUUID(x)))
  );

  if (client && targetIds.length > 0) {
    try {
      const { data, error } = await client
        .from('case_facts')
        .select('*')
        .in('case_id', targetIds)
        .order('updated_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return (data as CaseFact[]) || [];
      }
    } catch (err) {
      console.warn('fetchCaseFacts client notice:', err);
    }
  }

  try {
    const res = await fetch(`/api/db/facts?caseId=${encodeURIComponent(caseId)}`, { headers: await getAuthHeaders() });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.facts)) {
        return json.facts;
      }
    }
  } catch (err) {
    console.warn('fetchCaseFacts proxy notice:', err);
  }

  return [];
}

export async function fetchProfileFacts(profileId: string): Promise<ProfileFact[]> {
  const client = getSupabase();
  const dbProfileId = toValidUUID(profileId);
  const targetIds = Array.from(
    new Set([profileId, dbProfileId].filter((x) => Boolean(x) && isValidUUID(x)))
  );

  if (client && targetIds.length > 0) {
    try {
      const { data, error } = await client
        .from('profile_facts')
        .select('*')
        .in('profile_id', targetIds)
        .order('updated_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return (data as ProfileFact[]) || [];
      }
    } catch (err) {
      console.warn('fetchProfileFacts client notice:', err);
    }
  }

  try {
    const res = await fetch(`/api/db/facts?profileId=${encodeURIComponent(profileId)}`, { headers: await getAuthHeaders() });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.facts)) {
        return json.facts;
      }
    }
  } catch (err) {
    console.warn('fetchProfileFacts proxy notice:', err);
  }

  return [];
}

export async function saveExtractedFacts(
  caseId: string | null,
  citizenId: string | null,
  rawAiText: string
): Promise<{ extractedFacts: Array<{ key: string; value: string }>; cleanedText: string }> {
  const extractedFacts: Array<{ key: string; value: string }> = [];

  if (!rawAiText) {
    return { extractedFacts, cleanedText: '' };
  }

  const factRegex = /\[\[FACT:\s*([a-zA-Z0-9_\-\s]+?)\s*=\s*(.*?)\]\]/gi;
  let match;

  while ((match = factRegex.exec(rawAiText)) !== null) {
    const rawKey = match[1].trim();
    const key = rawKey.toLowerCase().replace(/[\s\-]+/g, '_');
    const value = match[2].trim();
    if (key && value) {
      extractedFacts.push({ key, value });
    }
  }

  const cleanedText = rawAiText.replace(/\[\[FACT:\s*.*?\s*=\s*.*?\]\]/gi, '').trim();

  const profileKeys = ['full_name', 'city', 'state', 'phone', 'preferred_language'];
  const client = getSupabase();
  const effectiveProfileId = (await resolveEffectiveCitizenId(citizenId)) || citizenId;

  for (const { key, value } of extractedFacts) {
    const nowIso = new Date().toISOString();
    const isProfileKey = profileKeys.includes(key);

    try {
      await fetch('/api/db/facts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          profile_id: isProfileKey ? citizenId : undefined,
          key,
          value,
          citizen_id: citizenId || 'guest_citizen',
        }),
      });
    } catch (err) {
      console.warn('saveExtractedFacts proxy notice:', err);
    }

    if (caseId && client && isValidUUID(caseId)) {
      try {
        await client.from('case_facts').upsert(
          {
            case_id: caseId,
            fact_key: key,
            fact_value: value,
            updated_at: nowIso,
          },
          { onConflict: 'case_id,fact_key' }
        );
      } catch (err) {
        console.warn('Upsert case_fact error:', err);
      }
    }

    if (isProfileKey && effectiveProfileId && client && isValidUUID(effectiveProfileId)) {
      try {
        await client.from('profile_facts').upsert(
          {
            profile_id: effectiveProfileId,
            fact_key: key,
            fact_value: value,
            updated_at: nowIso,
          },
          { onConflict: 'profile_id,fact_key' }
        );
      } catch (err) {
        console.warn('Upsert profile_fact error:', err);
      }
    }
  }

  return { extractedFacts, cleanedText };
}

export async function fetchFactsBlock(
  caseId: string | null,
  citizenId: string | null
): Promise<string> {
  const caseFacts = caseId ? await fetchCaseFacts(caseId) : [];
  const profileFacts = citizenId ? await fetchProfileFacts(citizenId) : [];

  if (caseFacts.length === 0 && profileFacts.length === 0) {
    return '';
  }

  let block = '';

  if (caseFacts.length > 0) {
    block += 'Yaad rakhne wali baatein is case ke baare me (in cheezon ko dobara mat poochna):\n';
    caseFacts.forEach((f) => {
      block += `- ${f.fact_key}: ${f.fact_value}\n`;
    });
  }

  if (profileFacts.length > 0) {
    if (block) block += '\n';
    block += 'User ke baare me general jaankari:\n';
    profileFacts.forEach((f) => {
      block += `- ${f.fact_key}: ${f.fact_value}\n`;
    });
  }

  return block.trim();
}

export function inferDocumentType(aiText: string): DocumentType {
  const text = aiText.toLowerCase();

  if (
    text.includes('not a legal document') ||
    text.includes('koi legal document nahi') ||
    text.includes('ticket') ||
    text.includes('bus ticket') ||
    text.includes('movie ticket') ||
    text.includes('receipt') ||
    text.includes('invalid document') ||
    text.includes('irrelevant') ||
    text.includes('non-legal') ||
    text.includes('photo of ticket') ||
    text.includes('stamp paper nahi')
  ) {
    return 'unknown';
  }

  if (text.includes('power of attorney') || text.includes('mukhtarnama') || text.includes('poa') || text.includes('मुख्तारनामा')) {
    return 'power_of_attorney';
  }
  if (text.includes('stamp') || text.includes('स्टांप') || text.includes('stamp paper')) {
    return 'stamp_paper';
  }
  if (text.includes('will') || text.includes('वसीयत') || text.includes('testament')) {
    return 'will';
  }
  if (text.includes('sale deed') || text.includes('बैनामा') || text.includes('विक्रय पत्र') || text.includes('deed')) {
    return 'sale_deed';
  }
  if (text.includes('registry') || text.includes('रजिस्ट्री') || text.includes('registration')) {
    return 'registry';
  }
  return 'unknown';
}

export async function uploadCaseDocument(
  caseId: string,
  file: File,
  _dataUrlOrCitizenId?: string,
  citizenIdParam?: string
): Promise<Document> {
  const client = getSupabase();
  const docId = generateUUID();
  const dbCaseId = toValidUUID(caseId);

  let targetCitizenId = citizenIdParam;
  if (_dataUrlOrCitizenId && !_dataUrlOrCitizenId.startsWith('data:')) {
    targetCitizenId = _dataUrlOrCitizenId;
  }

  const effectiveCitizenId = (await resolveEffectiveCitizenId(targetCitizenId)) || targetCitizenId || 'guest_citizen';
  const dbCitizenId = toValidUUID(effectiveCitizenId);
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${dbCaseId}/${docId}_${cleanFileName}`;

  if (client) {
    await ensureCaseRowExists(client, dbCaseId, dbCitizenId);
    try {
      const { data: buckets } = await client.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === 'documents');
      if (!bucketExists) {
        await client.storage.createBucket('documents', { public: false }).catch(() => {});
      }

      await client.storage
        .from('documents')
        .upload(storagePath, file, {
          upsert: true,
          contentType: file.type || 'image/png',
        });
    } catch (err) {
      console.warn('Storage upload notice:', err);
    }
  }

  const docObj: Document = {
    id: docId,
    case_id: dbCaseId,
    file_url: storagePath,
    document_type: 'unknown',
    ai_extracted_text: null,
    ai_analysis: null,
    is_verified_valid: null,
    uploaded_at: new Date().toISOString(),
  };

  try {
    const res = await fetch('/api/db/documents/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: docId,
        case_id: caseId,
        file_url: storagePath,
        document_type: 'unknown',
        citizen_id: targetCitizenId || 'guest_citizen',
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.document) return json.document;
    }
  } catch (err) {
    console.warn('uploadCaseDocument proxy notice:', err);
  }

  if (client) {
    try {
      const { data, error } = await client
        .from('documents')
        .insert({
          id: docId,
          case_id: dbCaseId,
          file_url: storagePath,
          document_type: 'unknown',
          uploaded_at: docObj.uploaded_at,
        })
        .select('*')
        .single();

      if (!error && data) {
        return data as Document;
      }
    } catch (err) {
      console.warn('Insert document error:', err);
    }
  }

  return docObj;
}

export async function fetchCaseDocuments(caseId: string): Promise<Document[]> {
  try {
    const res = await fetch(`/api/db/documents?caseId=${encodeURIComponent(caseId)}`, { headers: await getAuthHeaders() });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.documents)) {
        return json.documents;
      }
    }
  } catch (err) {
    console.warn('fetchCaseDocuments proxy notice:', err);
  }

  const client = getSupabase();
  const dbCaseId = toValidUUID(caseId);
  const targetIds = Array.from(
    new Set([caseId, dbCaseId].filter((x) => Boolean(x) && isValidUUID(x)))
  );

  if (client && targetIds.length > 0) {
    try {
      const { data, error } = await client
        .from('documents')
        .select('*')
        .in('case_id', targetIds)
        .order('uploaded_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as Document[];
      }
    } catch (err) {
      console.warn('fetchCaseDocuments client notice:', err);
    }
  }

  return [];
}

export async function deleteCaseDocument(docId: string): Promise<void> {
  const client = getSupabase();

  try {
    await fetch(`/api/db/documents/${encodeURIComponent(docId)}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('deleteCaseDocument proxy notice:', err);
  }

  if (client && isValidUUID(docId)) {
    try {
      await client.from('documents').delete().eq('id', docId);
    } catch (err) {
      console.warn('deleteCaseDocument client error:', err);
    }
  }
}

export async function updateCaseDocumentAnalysis(
  docId: string,
  caseId: string,
  extractedText: string,
  aiAnalysis: string,
  documentType: DocumentType,
  isVerifiedValid: boolean = true,
  citizenId?: string
): Promise<void> {
  try {
    const res = await fetch('/api/db/documents/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: docId,
        case_id: caseId,
        ai_extracted_text: extractedText,
        ai_analysis: aiAnalysis,
        document_type: documentType,
        is_verified_valid: isVerifiedValid,
        citizen_id: citizenId || 'guest_citizen',
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) return;
    }
  } catch (err) {
    console.error('updateCaseDocumentAnalysis proxy error:', err);
  }

  const client = getSupabase();
  if (client && isValidUUID(docId)) {
    try {
      const { error } = await client
        .from('documents')
        .update({
          ai_extracted_text: extractedText,
          ai_analysis: aiAnalysis,
          document_type: documentType,
          is_verified_valid: isVerifiedValid,
        })
        .eq('id', docId);
      if (error) {
        console.error('updateCaseDocumentAnalysis client error:', error);
      }
    } catch (err) {
      console.error('Update document analysis catch error:', err);
    }
  }
}
