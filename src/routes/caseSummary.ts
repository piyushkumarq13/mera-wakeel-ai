import express from "express";
import type { ServerContext } from "./context";
import { requireAuth, AuthedRequest } from "./authMiddleware";

export function registerCaseSummaryRoutes(app: express.Express, ctx: ServerContext): void {
  const { supabaseAdmin, isUuid, toUuid, serverResolveLawyerId } = ctx;

  function requestAuthId(req: express.Request): string | undefined {
    return (req as AuthedRequest).supabaseUserId;
  }

  // ─── GET /api/db/case-summaries ───
  app.get("/api/db/case-summaries", async (req, res) => {
    try {
      const caseId = req.query.caseId as string;
      if (!caseId || !supabaseAdmin) return res.json({ success: true, summary: null });

      const dbCaseId = toUuid(caseId);
      const { data: summary } = await supabaseAdmin
        .from('case_summaries')
        .select('*')
        .eq('case_id', caseId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      return res.json({ success: true, summary: summary || null });
    } catch (err: any) {
      console.warn("/api/db/case-summaries GET error:", err.message);
      return res.json({ success: true, summary: null });
    }
  });

  // ─── GET /api/db/case-summaries/versions ───
  app.get("/api/db/case-summaries/versions", async (req, res) => {
    try {
      const caseId = req.query.caseId as string;
      if (!caseId || !supabaseAdmin) return res.json({ success: true, versions: [] });

      const { data } = await supabaseAdmin
        .from('case_summaries')
        .select('*')
        .eq('case_id', caseId)
        .order('version', { ascending: false });

      return res.json({ success: true, versions: data || [] });
    } catch (err: any) {
      return res.json({ success: true, versions: [] });
    }
  });

  // ─── POST /api/db/case-summaries/save ───
  app.post("/api/db/case-summaries/save", requireAuth, async (req, res) => {
    try {
      const summaryData = req.body;
      if (!summaryData?.case_id) return res.status(400).json({ error: "case_id required" });

      if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });

      const { data, error } = await supabaseAdmin
        .from('case_summaries')
        .upsert(summaryData, { onConflict: 'case_id,version' })
        .select('*')
        .single();

      if (error) {
        console.warn("/api/db/case-summaries/save error:", error.message);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ success: true, summary: data });
    } catch (err: any) {
      console.error("/api/db/case-summaries/save exception:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── POST /api/db/case-summaries/status ───
  app.post("/api/db/case-summaries/status", requireAuth, async (req, res) => {
    try {
      const { caseId, report_status, assigned_lawyer_id, assigned_lawyer_name, lawyer_accepted_at, lawyer_request_status } = req.body;
      if (!caseId || !supabaseAdmin) return res.status(400).json({ error: "caseId required" });

      const updateData: any = { updated_at: new Date().toISOString() };
      if (report_status) updateData.report_status = report_status;
      if (assigned_lawyer_id !== undefined) updateData.assigned_lawyer_id = assigned_lawyer_id;
      if (assigned_lawyer_name !== undefined) updateData.assigned_lawyer_name = assigned_lawyer_name;
      if (lawyer_accepted_at !== undefined) updateData.lawyer_accepted_at = lawyer_accepted_at;
      if (lawyer_request_status !== undefined) updateData.lawyer_request_status = lawyer_request_status;

      // Update the latest version
      await supabaseAdmin
        .from('case_summaries')
        .update(updateData)
        .eq('case_id', caseId)
        .eq('version', 
          (await supabaseAdmin.from('case_summaries').select('version').eq('case_id', caseId).order('version', { ascending: false }).limit(1).maybeSingle())?.data?.version || 1
        );

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── POST /api/db/case-summaries/generate ───
  app.post("/api/db/case-summaries/generate", requireAuth, async (req, res) => {
    try {
      const { caseId } = req.body;
      if (!caseId || !supabaseAdmin) return res.status(400).json({ error: "caseId required" });

      const authId = requestAuthId(req);
      if (!authId) return res.status(401).json({ error: "Auth required" });

      // Check existing summary
      const { data: existing } = await supabaseAdmin
        .from('case_summaries')
        .select('version')
        .eq('case_id', caseId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = existing ? existing.version + 1 : 1;

      // Gather case data
      const { data: caseRow } = await supabaseAdmin
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .maybeSingle();

      if (!caseRow) return res.status(404).json({ error: "Case not found" });

      const [factsResult, docsResult, evidenceResult] = await Promise.all([
        supabaseAdmin.from('case_facts').select('*').eq('case_id', caseId),
        supabaseAdmin.from('documents').select('*').eq('case_id', caseId),
        supabaseAdmin.from('case_evidence').select('*').eq('case_id', caseId),
      ]);

      const facts = factsResult.data || [];
      const docs = docsResult.data || [];
      const evidence = evidenceResult.data || [];

      const factsMap: Record<string, string> = {};
      facts.forEach((f: any) => { factsMap[f.fact_key] = f.fact_value; });

      // Build summary data
      const category = (caseRow.category || 'other').charAt(0).toUpperCase() + (caseRow.category || 'other').slice(1);
      const title = caseRow.title || 'Legal Case';
      const location = factsMap['city'] || factsMap['state'] || factsMap['location'] || 'Location not specified';

      const keyFacts = facts.map((f: any) => `${f.fact_key}: ${f.fact_value}`);
      const documentsList = docs.map((d: any) => {
        const name = d.file_url ? decodeURIComponent(d.file_url.split('/').pop()?.replace(/^.*_/, '') || 'Document') : 'Document';
        return `${name} (${(d.document_type || 'unknown').replace(/_/g, ' ')})`;
      });
      const evidenceList = evidence.map((e: any) => e.evidence_description);

      const missingInfo: string[] = [];
      if (!factsMap['incident_date']) missingInfo.push('Exact incident date');
      if (!factsMap['opposite_party_name'] && !factsMap['opposite_party']) missingInfo.push('Opposite party details');
      if (docs.length === 0) missingInfo.push('Supporting documents');

      const score = Math.min(95, 40 + (docs.length > 0 ? 10 : 0) + (evidence.length > 0 ? 10 : 0) + (facts.length > 3 ? 5 : 0) + 10);

      const executiveSummary = [
        `This is a ${category.toLowerCase()} matter involving "${title}".`,
        factsMap['complainant_name'] ? `The complainant is ${factsMap['complainant_name']}.` : '',
        factsMap['opposite_party_name'] || factsMap['opposite_party'] ? `The opposite party is ${factsMap['opposite_party_name'] || factsMap['opposite_party']}.` : '',
        factsMap['incident_date'] ? `The incident occurred on ${factsMap['incident_date']}.` : '',
        `Matter is based in ${location}.`,
        caseRow.ai_summary ? `AI Analysis: ${caseRow.ai_summary}` : '',
      ].filter(Boolean).join(' ');

      const shortBrief = [
        `CASE TYPE: ${category} Dispute`,
        `TITLE: ${title}`,
        `LOCATION: ${location}`,
        '',
        executiveSummary.substring(0, 500),
        '',
        `Documents: ${documentsList.length} | Evidence: ${evidenceList.length} | Facts: ${facts.length}`,
      ].join('\n');

      const reportId = `MWA-RPT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const summaryPayload = {
        id: crypto.randomUUID(),
        case_id: caseId,
        version: nextVersion,
        case_title: title,
        case_category: caseRow.category,
        incident_date: factsMap['incident_date'] || null,
        location,
        complainant_name: factsMap['complainant_name'] || factsMap['full_name'] || null,
        opposite_party_name: factsMap['opposite_party_name'] || factsMap['opposite_party'] || null,
        relationship_between_parties: factsMap['relationship'] || null,
        executive_summary: executiveSummary,
        key_facts: keyFacts,
        disputed_facts: [],
        documents_list: documentsList,
        evidence_list: evidenceList,
        witnesses: factsMap['witnesses'] ? [factsMap['witnesses']] : [],
        applicable_laws: [],
        legal_questions: ['Verify all documents', 'Confirm timeline', 'Assess limitation period'],
        ai_analysis: caseRow.ai_summary || null,
        case_strength_score: score,
        score_reasoning: `Based on ${facts.length} facts, ${docs.length} documents, ${evidence.length} evidence items.`,
        positive_factors: docs.length > 0 ? [`${docs.length} document(s) uploaded`] : [],
        uncertain_factors: missingInfo.length > 0 ? [`${missingInfo.length} item(s) missing`] : [],
        actions_already_taken: [],
        recommended_next_steps: ['Gather supporting documents', 'Consult with advocate'],
        case_timeline: caseRow.created_at ? [{ date: new Date(caseRow.created_at).toLocaleDateString('en-IN'), event: 'Case created', source: 'system' }] : [],
        missing_information: missingInfo,
        questions_for_lawyer: ['Verify documents', 'Confirm timeline', 'Identify additional evidence'],
        report_id: reportId,
        report_status: 'READY',
        short_brief: shortBrief,
        ai_generated_at: new Date().toISOString(),
        ai_last_updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: saved, error: saveError } = await supabaseAdmin
        .from('case_summaries')
        .upsert(summaryPayload, { onConflict: 'case_id,version' })
        .select('*')
        .single();

      if (saveError) {
        console.warn("/api/db/case-summaries/generate save error:", saveError.message);
        return res.status(500).json({ error: saveError.message });
      }

      return res.json({ success: true, summary: saved });
    } catch (err: any) {
      console.error("/api/db/case-summaries/generate exception:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── Lawyer Notes ───
  app.get("/api/db/lawyer-notes", async (req, res) => {
    try {
      const caseId = req.query.caseId as string;
      const lawyerId = req.query.lawyerId as string;
      if (!caseId || !supabaseAdmin) return res.json({ success: true, notes: null });

      let query = supabaseAdmin.from('lawyer_notes').select('*').eq('case_id', caseId);
      if (lawyerId) query = query.eq('lawyer_id', lawyerId);

      const { data } = await query.maybeSingle();
      return res.json({ success: true, notes: data || null });
    } catch (err: any) {
      return res.json({ success: true, notes: null });
    }
  });

  app.post("/api/db/lawyer-notes/save", requireAuth, async (req, res) => {
    try {
      const { case_id, lawyer_id, notes, legal_strategy, client_instructions, next_hearing, follow_up_date } = req.body;
      if (!case_id || !lawyer_id || !supabaseAdmin) return res.status(400).json({ error: "case_id and lawyer_id required" });

      const payload = {
        id: crypto.randomUUID(),
        case_id,
        lawyer_id,
        notes: notes || null,
        legal_strategy: legal_strategy || null,
        client_instructions: client_instructions || null,
        next_hearing: next_hearing || null,
        follow_up_date: follow_up_date || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('lawyer_notes')
        .upsert(payload, { onConflict: 'case_id,lawyer_id' })
        .select('*')
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, notes: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });
}
