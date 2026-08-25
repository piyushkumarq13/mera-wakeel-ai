import { CaseSummary } from './db/caseSummary';
import { getSupabase, isValidUUID } from './db/client';

const FILLER_PATTERNS = [
  /please\s*wait/i,
  /थोड़ा\s*समय\s*दें/i,
  /network\s*(में|is)\s*(कुछ|some|slow)/i,
  /धीमापन/i,
  /main\s*abhi/i,
  /मैं\s*अभी/i,
  /फिर\s*से\s*देख\s*रह/i,
  /कृपया\s*प्रतीक्षा/i,
  /hold\s*on/i,
  /बस\s*एक\s*मिनट/i,
  /loading/i,
  /generating\.\.\./i,
  /\.\.\.please/i,
];

function isFillerText(text: string | null | undefined): boolean {
  if (!text || typeof text !== 'string') return true;
  const trimmed = text.trim();
  if (trimmed.length < 15) return true;
  return FILLER_PATTERNS.some(p => p.test(trimmed));
}

function cleanCaseTitle(title: string | null | undefined): string {
  if (!title) return 'Legal Case';
  let t = title.trim();
  t = t.replace(/^Case:\s*/i, '');
  t = t.replace(/^Mamla:\s*/i, '');
  return t || 'Legal Case';
}

/**
 * Generate a comprehensive AI case report from all available case data.
 * This is the main AI analysis engine that structures data into the CaseSummary format.
 */
export async function generateAIReport(
  caseId: string,
  existingSummary?: Partial<CaseSummary>
): Promise<Partial<CaseSummary>> {
  const client = getSupabase();
  if (!client || !caseId) return existingSummary || {};

  // Gather all case data
  const { data: caseRow } = await client
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .maybeSingle();

  if (!caseRow) return existingSummary || {};

  // Fetch all related data
  const [factsResult, docsResult, evidenceResult, messagesResult] = await Promise.all([
    client.from('case_facts').select('*').eq('case_id', caseId).order('updated_at', { ascending: true }),
    client.from('documents').select('*').eq('case_id', caseId).order('uploaded_at', { ascending: false }),
    client.from('case_evidence').select('*').eq('case_id', caseId).order('id', { ascending: true }),
    client.from('messages').select('*').eq('case_id', caseId).order('created_at', { ascending: true }),
  ]);

  const facts = factsResult.data || [];
  const docs = docsResult.data || [];
  const evidence = evidenceResult.data || [];
  const messages = messagesResult.data || [];

  // Build structured data from facts
  const factsMap: Record<string, string> = {};
  facts.forEach(f => { factsMap[f.fact_key] = f.fact_value; });

  // Build key facts
  const keyFacts: string[] = facts.map(f => `${f.fact_key}: ${f.fact_value}`);

  // Build disputed facts from uncertain entries
  const disputedFacts: string[] = [];
  if (factsMap['dispute_details']) disputedFacts.push(factsMap['dispute_details']);
  if (factsMap['opposite_party_claims']) disputedFacts.push(`Opposite party claims: ${factsMap['opposite_party_claims']}`);

  // Build documents list
  const documentsList: string[] = docs.map(d => {
    const name = d.file_url ? decodeURIComponent(d.file_url.split('/').pop()?.replace(/^.*_/, '') || 'Document') : 'Document';
    const type = d.document_type || 'unknown';
    return `${name} (${type.replace(/_/g, ' ')})`;
  });

  // Build evidence list
  const evidenceList: string[] = evidence.map(e => e.evidence_description);

  // Build witnesses from facts
  const witnesses: string[] = [];
  if (factsMap['witnesses']) witnesses.push(factsMap['witnesses']);
  if (factsMap['witness_names']) witnesses.push(factsMap['witness_names']);

  // Build timeline from messages and facts
  const timeline: Array<{ date: string; event: string; source?: string }> = [];
  if (caseRow.created_at) {
    timeline.push({ date: new Date(caseRow.created_at).toLocaleDateString('en-IN'), event: 'Case created on Mera Wakeel AI', source: 'system' });
  }
  // Extract dates from messages
  const dateMessages = messages.filter(m => m.content && /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(m.content));
  dateMessages.slice(0, 5).forEach(m => {
    const dateMatch = m.content.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
    if (dateMatch) {
      timeline.push({ date: dateMatch[0], event: m.content.substring(0, 100), source: 'conversation' });
    }
  });

  // Build missing information
  const missingInfo: string[] = [];
  if (!factsMap['incident_date'] && !factsMap['date_of_incident']) missingInfo.push('Exact incident/dispute date');
  if (!factsMap['opposite_party_name'] && !factsMap['opposite_party'] && !factsMap['respondent']) missingInfo.push('Opposite party identification details');
  if (docs.length === 0) missingInfo.push('Supporting documents (no documents uploaded yet)');
  if (!factsMap['property_address'] && !factsMap['location'] && caseRow.category === 'property') missingInfo.push('Property address/location details');
  if (!factsMap['agreement_date'] && caseRow.category === 'tenant') missingInfo.push('Lease/agreement date');
  if (!factsMap['marriage_date'] && caseRow.category === 'family') missingInfo.push('Marriage date');

  // Build questions for lawyer
  const questionsForLawyer = [
    'Please verify the authenticity and completeness of all uploaded documents.',
    'Confirm the timeline of events and key dates.',
    'Identify any additional evidence or documentation needed.',
    'Assess limitation period applicability.',
    'Review any previous related litigation.',
  ];

  // Build actions taken
  const actionsTaken: string[] = [];
  if (factsMap['legal_notice_sent'] || factsMap['notice_sent']) actionsTaken.push('Legal notice sent');
  if (factsMap['police_complaint'] || factsMap['fir_filed']) actionsTaken.push('Police complaint / FIR filed');
  if (factsMap['court_case_filed']) actionsTaken.push('Court case filed');

  // Build recommended next steps
  const nextSteps: string[] = [];
  if (!actionsTaken.some(a => a.includes('notice'))) nextSteps.push('Send legal notice to opposite party');
  nextSteps.push('Gather and organize all supporting documents');
  nextSteps.push('Consult with assigned advocate for case strategy');
  nextSteps.push('Prepare for potential court proceedings');

  // Calculate case strength based on available data
  let score = 40; // Base
  if (docs.length > 0) score += 10;
  if (evidence.length > 0) score += 10;
  if (facts.length > 3) score += 5;
  if (witnesses.length > 0) score += 10;
  if (actionsTaken.length > 0) score += 10;
  if (factsMap['registered_document'] || factsMap['sale_deed'] || factsMap['registry']) score += 10;
  score = Math.min(score, 95);

  const positiveFactors: string[] = [];
  if (docs.length > 0) positiveFactors.push(`${docs.length} document(s) uploaded and available`);
  if (evidence.length > 0) positiveFactors.push(`${evidence.length} evidence item(s) identified`);
  if (witnesses.length > 0) positiveFactors.push('Witnesses reportedly available');
  if (actionsTaken.length > 0) positiveFactors.push('Previous legal actions taken');

  const uncertainFactors: string[] = [];
  if (missingInfo.length > 0) uncertainFactors.push(`${missingInfo.length} information item(s) still missing`);
  if (facts.length < 3) uncertainFactors.push('Limited case facts gathered so far');

  // Build executive summary
  const category = (caseRow.category || 'other').charAt(0).toUpperCase() + (caseRow.category || 'other').slice(1);
  const title = cleanCaseTitle(caseRow.title);
  const location = factsMap['city'] || factsMap['state'] || factsMap['location'] || 'Location not specified';

  // Guard: reject filler text from ai_summary
  const rawAiSummary = isFillerText(caseRow.ai_summary) ? null : caseRow.ai_summary;

  const executiveSummary = [
    `This is a ${category.toLowerCase()} matter involving "${title}".`,
    factsMap['complainant_name'] ? `The complainant/applicant is ${factsMap['complainant_name']}.` : '',
    factsMap['opposite_party_name'] || factsMap['opposite_party'] ? `The opposite party/respondent is ${factsMap['opposite_party_name'] || factsMap['opposite_party']}.` : '',
    factsMap['incident_date'] || factsMap['date_of_incident'] ? `The incident occurred on ${factsMap['incident_date'] || factsMap['date_of_incident']}.` : '',
    `Matter is based in ${location}.`,
    docs.length > 0 ? `${documentsList.length} document(s) have been uploaded for analysis.` : 'No documents have been uploaded yet.',
    evidence.length > 0 ? `${evidence.length} evidence item(s) have been identified.` : '',
    rawAiSummary ? `AI Analysis: ${rawAiSummary}` : '',
  ].filter(Boolean).join(' ');

  // Build short brief
  const shortBrief = [
    `CASE TYPE: ${category} Dispute`,
    `TITLE: ${title}`,
    `LOCATION: ${location}`,
    '',
    executiveSummary.substring(0, 500),
    '',
    `Documents: ${documentsList.length} | Evidence: ${evidenceList.length} | Facts: ${facts.length}`,
  ].join('\n');

  return {
    case_id: caseId,
    case_title: title,
    case_category: caseRow.category,
    case_sub_category: caseRow.sub_category || null,
    incident_date: factsMap['incident_date'] || factsMap['date_of_incident'] || null,
    location,
    complainant_name: factsMap['complainant_name'] || factsMap['full_name'] || null,
    complainant_role: factsMap['complainant_role'] || null,
    opposite_party_name: factsMap['opposite_party_name'] || factsMap['opposite_party'] || factsMap['respondent'] || factsMap['opponent_name'] || null,
    opposite_party_role: factsMap['opposite_party_role'] || factsMap['opponent_relation'] || null,
    opposite_party_details: factsMap['opposite_party_details'] || factsMap['opponent_details'] || null,
    relationship_between_parties: factsMap['relationship'] || factsMap['opponent_relation'] || null,
    executive_summary: executiveSummary,
    key_facts: keyFacts,
    disputed_facts: disputedFacts,
    documents_list: documentsList,
    evidence_list: evidenceList,
    witnesses,
    applicable_laws: [],
    legal_questions: questionsForLawyer,
    ai_analysis: rawAiSummary,
    case_strength_score: score,
    score_reasoning: `Based on ${facts.length} facts, ${docs.length} documents, ${evidence.length} evidence items, and ${witnesses.length} witnesses.`,
    positive_factors: positiveFactors,
    uncertain_factors: uncertainFactors,
    actions_already_taken: actionsTaken,
    recommended_next_steps: nextSteps,
    case_timeline: timeline,
    missing_information: missingInfo,
    questions_for_lawyer: questionsForLawyer,
    short_brief: shortBrief,
    report_status: 'READY',
  };
}
