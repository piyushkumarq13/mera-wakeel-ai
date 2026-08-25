import { CaseSummary, LawyerNote } from '../../types/database';
import { getSupabase, generateUUID, isValidUUID, toValidUUID } from './client';
import { getAuthHeaders } from './authClient';
import { fetchCaseById, fetchCaseFacts, fetchCaseDocuments, fetchCaseEvidence, fetchCaseMessages } from './cases';

export type { CaseSummary, LawyerNote };

function generateReportId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MWA-RPT-${ts}-${rand}`;
}

// ─── Fetch latest case summary ───
export async function fetchLatestCaseSummary(caseId: string): Promise<CaseSummary | null> {
  if (!caseId) return null;

  try {
    const res = await fetch(`/api/db/case-summaries?caseId=${encodeURIComponent(caseId)}`, { headers: await getAuthHeaders() });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.summary) return json.summary as CaseSummary;
    }
  } catch (err) {
    console.warn('fetchLatestCaseSummary proxy notice:', err);
  }

  const client = getSupabase();
  if (client && isValidUUID(caseId)) {
    try {
      const { data, error } = await client
        .from('case_summaries')
        .select('*')
        .eq('case_id', caseId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) return data as CaseSummary;
    } catch (err) {
      console.warn('fetchLatestCaseSummary client notice:', err);
    }
  }

  return null;
}

// ─── Fetch all versions of a case summary ───
export async function fetchCaseSummaryVersions(caseId: string): Promise<CaseSummary[]> {
  if (!caseId) return [];

  const client = getSupabase();
  if (client && isValidUUID(caseId)) {
    try {
      const { data, error } = await client
        .from('case_summaries')
        .select('*')
        .eq('case_id', caseId)
        .order('version', { ascending: false });

      if (!error && data) return data as CaseSummary[];
    } catch (err) {
      console.warn('fetchCaseSummaryVersions notice:', err);
    }
  }

  return [];
}

// ─── Save/Upcase case summary ───
export async function saveCaseSummary(summary: Partial<CaseSummary> & { case_id: string }): Promise<CaseSummary> {
  const client = getSupabase();

  // Determine version
  let nextVersion = 1;
  const existing = await fetchLatestCaseSummary(summary.case_id);
  if (existing) {
    nextVersion = existing.version + 1;
  }

  const nowIso = new Date().toISOString();
  const summaryData: any = {
    id: generateUUID(),
    case_id: summary.case_id,
    version: nextVersion,
    case_title: summary.case_title || null,
    case_category: summary.case_category || null,
    case_sub_category: summary.case_sub_category || null,
    incident_date: summary.incident_date || null,
    location: summary.location || null,
    complainant_name: summary.complainant_name || null,
    complainant_role: summary.complainant_role || null,
    complainant_details: summary.complainant_details || null,
    opposite_party_name: summary.opposite_party_name || null,
    opposite_party_role: summary.opposite_party_role || null,
    opposite_party_details: summary.opposite_party_details || null,
    relationship_between_parties: summary.relationship_between_parties || null,
    executive_summary: summary.executive_summary || null,
    key_facts: summary.key_facts || [],
    disputed_facts: summary.disputed_facts || [],
    documents_list: summary.documents_list || [],
    evidence_list: summary.evidence_list || [],
    witnesses: summary.witnesses || [],
    applicable_laws: summary.applicable_laws || [],
    legal_questions: summary.legal_questions || [],
    ai_analysis: summary.ai_analysis || null,
    ai_reasoning: summary.ai_reasoning || null,
    case_strength_score: summary.case_strength_score ?? null,
    score_reasoning: summary.score_reasoning || null,
    positive_factors: summary.positive_factors || [],
    uncertain_factors: summary.uncertain_factors || [],
    actions_already_taken: summary.actions_already_taken || [],
    recommended_next_steps: summary.recommended_next_steps || [],
    case_timeline: summary.case_timeline || [],
    missing_information: summary.missing_information || [],
    questions_for_lawyer: summary.questions_for_lawyer || [],
    report_id: summary.report_id || generateReportId(),
    report_status: summary.report_status || 'DRAFT',
    short_brief: summary.short_brief || null,
    assigned_lawyer_id: summary.assigned_lawyer_id || null,
    assigned_lawyer_name: summary.assigned_lawyer_name || null,
    lawyer_accepted_at: summary.lawyer_accepted_at || null,
    lawyer_request_status: summary.lawyer_request_status || 'none',
    ai_generated_at: summary.ai_generated_at || nowIso,
    ai_last_updated_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  };

  // Try server proxy first
  try {
    const res = await fetch('/api/db/case-summaries/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify(summaryData),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.summary) return json.summary as CaseSummary;
    }
  } catch (err) {
    console.warn('saveCaseSummary proxy notice:', err);
  }

  // Fallback to direct Supabase
  if (client) {
    try {
      const { data, error } = await client
        .from('case_summaries')
        .upsert(summaryData, { onConflict: 'case_id,version' })
        .select('*')
        .single();

      if (!error && data) return data as CaseSummary;
    } catch (err) {
      console.warn('saveCaseSummary client notice:', err);
    }
  }

  return summaryData as CaseSummary;
}

// ─── Update report status ───
export async function updateReportStatus(
  caseId: string,
  status: CaseSummary['report_status'],
  extra?: Partial<CaseSummary>
): Promise<void> {
  const client = getSupabase();
  const nowIso = new Date().toISOString();
  const updateData: any = { report_status: status, updated_at: nowIso };
  if (extra) Object.assign(updateData, extra);

  try {
    await fetch('/api/db/case-summaries/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify({ caseId, ...updateData }),
    });
  } catch (err) {
    console.warn('updateReportStatus proxy notice:', err);
  }

  if (client && isValidUUID(caseId)) {
    try {
      await client
        .from('case_summaries')
        .update(updateData)
        .eq('case_id', caseId)
        .order('version', { ascending: false })
        .limit(1);
    } catch (err) {
      console.warn('updateReportStatus client notice:', err);
    }
  }
}

// ─── Assign lawyer to case summary ───
export async function assignLawyerToSummary(
  caseId: string,
  lawyerId: string,
  lawyerName: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  await updateReportStatus(caseId, 'ACCEPTED', {
    assigned_lawyer_id: lawyerId,
    assigned_lawyer_name: lawyerName,
    lawyer_accepted_at: nowIso,
    lawyer_request_status: 'accepted',
  });
}

// ─── Decline lawyer request ───
export async function declineLawyerRequest(
  caseId: string,
  _reason?: string
): Promise<void> {
  await updateReportStatus(caseId, 'DECLINED', {
    lawyer_request_status: 'declined',
  });
}

// ─── Lawyer Notes CRUD ───
export async function fetchLawyerNotes(caseId: string, lawyerId: string): Promise<LawyerNote | null> {
  const client = getSupabase();
  if (client && isValidUUID(caseId)) {
    try {
      const { data, error } = await client
        .from('lawyer_notes')
        .select('*')
        .eq('case_id', caseId)
        .eq('lawyer_id', lawyerId)
        .maybeSingle();

      if (!error && data) return data as LawyerNote;
    } catch (err) {
      console.warn('fetchLawyerNotes notice:', err);
    }
  }
  return null;
}

export async function saveLawyerNotes(
  caseId: string,
  lawyerId: string,
  notes: Partial<LawyerNote>
): Promise<LawyerNote> {
  const client = getSupabase();
  const nowIso = new Date().toISOString();
  const payload: any = {
    id: generateUUID(),
    case_id: caseId,
    lawyer_id: lawyerId,
    notes: notes.notes || null,
    legal_strategy: notes.legal_strategy || null,
    client_instructions: notes.client_instructions || null,
    next_hearing: notes.next_hearing || null,
    follow_up_date: notes.follow_up_date || null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  if (client) {
    try {
      const { data, error } = await client
        .from('lawyer_notes')
        .upsert(payload, { onConflict: 'case_id,lawyer_id' })
        .select('*')
        .single();
      if (!error && data) return data as LawyerNote;
    } catch (err) {
      console.warn('saveLawyerNotes notice:', err);
    }
  }

  return payload as LawyerNote;
}

// ─── Build structured summary data from existing case info ───
export async function buildSummaryFromCaseData(caseId: string): Promise<Partial<CaseSummary>> {
  const caseRow = await fetchCaseById(caseId);
  const facts = await fetchCaseFacts(caseId);
  const docs = await fetchCaseDocuments(caseId);
  const evidence = await fetchCaseEvidence(caseId);
  const messages = await fetchCaseMessages(caseId);

  // Filler text detection patterns
  const FILLER_PATTERNS = [
    /please\s*wait/i, /थोड़ा\s*समय\s*दें/i, /network\s*(में|is)\s*(कुछ|some|slow)/i,
    /धीमापन/i, /main\s*abhi/i, /मैं\s*अभी/i, /फिर\s*से\s*देख\s*रह/i,
    /कृपया\s*प्रतीक्षा/i, /hold\s*on/i, /बस\s*एक\s*मिनट/i, /loading/i,
    /generating\.\.\./i, /\.\.\.please/i,
  ];
  const isFiller = (t: string | null | undefined) => {
    if (!t || typeof t !== 'string') return true;
    const trimmed = t.trim();
    if (trimmed.length < 15) return true;
    return FILLER_PATTERNS.some(p => p.test(trimmed));
  };

  const rawAiSummary = isFiller(caseRow?.ai_summary) ? null : caseRow?.ai_summary;

  // Clean title — remove "Case: " prefix
  let title = caseRow?.title || 'Legal Case';
  title = title.replace(/^Case:\s*/i, '').replace(/^Mamla:\s*/i, '').trim() || 'Legal Case';

  // Build timeline from messages and facts
  const timeline: Array<{ date: string; event: string; source?: string }> = [];
  if (caseRow?.created_at) {
    timeline.push({ date: caseRow.created_at, event: 'Case created', source: 'system' });
  }

  // Extract key facts
  const keyFacts: string[] = [];
  const disputedFacts: string[] = [];
  const factsMap: Record<string, string> = {};
  for (const f of facts) {
    factsMap[f.fact_key] = f.fact_value;
    keyFacts.push(`${f.fact_key}: ${f.fact_value}`);
  }

  // Build documents list
  const documentsList: string[] = docs.map((d) => {
    const name = d.file_url ? d.file_url.split('/').pop()?.replace(/^.*_/, '') || 'Document' : 'Document';
    return `${name} (${d.document_type || 'unknown'})`;
  });

  // Build evidence list
  const evidenceList: string[] = evidence.map((e) => e.evidence_description);

  // Build short brief (4-8 lines)
  const category = caseRow?.category || 'other';
  const location = factsMap['city'] || factsMap['location'] || factsMap['state'] || 'Not specified';

  const shortBrief = [
    `Case Type: ${category.charAt(0).toUpperCase() + category.slice(1)} Dispute`,
    `Title: ${title}`,
    `Location: ${location}`,
    '',
    rawAiSummary || 'AI analysis pending. Information is being gathered from the conversation and uploaded documents.',
    '',
    `Documents Available: ${documentsList.length}`,
    `Key Evidence: ${evidenceList.length}`,
  ].join('\n');

  // Determine missing info
  const missingInfo: string[] = [];
  if (!factsMap['incident_date'] && !factsMap['date']) missingInfo.push('Exact incident date');
  if (!factsMap['opposite_party'] && !factsMap['respondent'] && !factsMap['opposite_party_name'] && !factsMap['opponent_name']) missingInfo.push('Opposite party details');
  if (docs.length === 0) missingInfo.push('Supporting documents');
  if (!factsMap['incident_location'] && !factsMap['property_address'] && !factsMap['location']) missingInfo.push('Exact location of incident/property');

  // Build witnesses
  const witnesses: string[] = [];
  if (factsMap['witnesses']) witnesses.push(factsMap['witnesses']);
  if (factsMap['witness_names']) witnesses.push(factsMap['witness_names']);

  return {
    case_id: caseId,
    case_title: title,
    case_category: category,
    case_sub_category: null,
    incident_date: factsMap['incident_date'] || factsMap['date'] || null,
    location: location,
    complainant_name: factsMap['full_name'] || factsMap['complainant_name'] || null,
    complainant_role: factsMap['complainant_role'] || null,
    opposite_party_name: factsMap['opposite_party'] || factsMap['respondent'] || factsMap['opposite_party_name'] || factsMap['opponent_name'] || null,
    opposite_party_role: factsMap['opposite_party_role'] || factsMap['opponent_relation'] || null,
    opposite_party_details: factsMap['opposite_party_details'] || null,
    relationship_between_parties: factsMap['relationship'] || factsMap['opponent_relation'] || null,
    executive_summary: rawAiSummary || `This is a ${category} matter. Case under analysis. Information being gathered.`,
    key_facts: keyFacts,
    disputed_facts: disputedFacts,
    documents_list: documentsList,
    evidence_list: evidenceList,
    witnesses,
    applicable_laws: [],
    legal_questions: [],
    ai_analysis: rawAiSummary,
    case_strength_score: caseRow?.confidence_score ? Math.round(Number(caseRow.confidence_score) * 100) : null,
    actions_already_taken: [],
    recommended_next_steps: [],
    case_timeline: timeline,
    missing_information: missingInfo,
    questions_for_lawyer: [
      'Please verify all provided documents',
      'Confirm timeline of events',
      'Identify any additional evidence required',
    ],
    short_brief: shortBrief,
    report_status: 'READY',
  };
}

// ─── Ensure case summary exists (auto-generate if needed) ───
export async function ensureCaseSummary(caseId: string): Promise<CaseSummary> {
  const existing = await fetchLatestCaseSummary(caseId);
  if (existing) return existing;

  // Auto-generate from case data
  const summaryData = await buildSummaryFromCaseData(caseId);
  return saveCaseSummary(summaryData as Partial<CaseSummary> & { case_id: string });
}
