import express from "express";
import type { ServerContext } from "./context";
import { detectLanguageWithStats } from "../lib/language";
import { normalizeConnectionStatus, dedupeConnections } from "../lib/db/status";
import { requireAuth, optionalAuth, AuthedRequest } from "./authMiddleware";

function sanitizeDbDocumentType(type?: string | null): string {
  if (!type) return 'unknown';
  const validSet = new Set(['stamp_paper', 'will', 'registry', 'sale_deed', 'power_of_attorney', 'affidavit', 'contract', 'court_notice', 'lease_agreement', 'legal_notice', 'other', 'unknown']);
  const lower = String(type).toLowerCase().trim();
  if (validSet.has(lower)) return lower;
  if (lower.includes('stamp')) return 'stamp_paper';
  if (lower.includes('will')) return 'will';
  if (lower.includes('registry') || lower.includes('registration')) return 'registry';
  if (lower.includes('sale') || lower.includes('deed')) return 'sale_deed';
  if (lower.includes('power of attorney') || lower.includes('mukhtarnama')) return 'power_of_attorney';
  if (lower.includes('affidavit')) return 'affidavit';
  if (lower.includes('contract') || lower.includes('agreement')) return 'contract';
  if (lower.includes('court notice') || lower.includes('legal notice')) return 'legal_notice';
  if (lower.includes('lease')) return 'lease_agreement';
  return 'unknown';
}

export function registerDbRoutes(app: express.Express, ctx: ServerContext): void {
  const { supabaseAdmin, isUuid, toUuid, serverEnsureProfile, serverEnsureCase, serverResolveLawyerId, GUEST_PROFILE_ID, trackAnalyticsEvent, adminUsesServiceRole } = ctx;

  async function notifyLawyerOfRequest(lawyerRowId: string, citizenId: string, caseId: string): Promise<boolean> {
    try {
      if (!supabaseAdmin) return false;
      const { data: lawyerRow } = await supabaseAdmin
        .from('lawyers')
        .select('id, profile_id, profile:profiles(id, full_name, phone)')
        .eq('id', lawyerRowId)
        .maybeSingle();
      const anyRow = lawyerRow as any;
      const fullName = anyRow?.profile?.full_name || 'Advocate';
      const phone = String(anyRow?.profile?.phone || '').trim();

      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_FROM_NUMBER;
      if (!sid || !token || !from || !phone) {
        console.warn(`[MERA-FIX] SMS not sent for lawyer ${lawyerRowId}: Twilio config or lawyer phone missing`);
        return false;
      }

      const messageBody = `MERA Wakeel: Adv. ${fullName}, aapke paas ek naya kanooni consultation request aaya hai. Apne Advocate Dashboard mein jakar Accept & Connect karein.`;
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, From: from, Body: messageBody }).toString(),
      });
      if (!res.ok) {
        console.warn(`[MERA-FIX] SMS send failed (${res.status}): ${await res.text().catch(() => '')}`);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[MERA-FIX] SMS send error:', err);
      return false;
    }
  }

  function requestAuthId(req: express.Request): string | undefined {
    return (req as AuthedRequest).supabaseUserId;
  }

  function isGuestProfileRef(id?: string): boolean {
    if (!id) return true;
    const lower = String(id).toLowerCase();
    if (lower === 'guest' || lower === 'guest_citizen' || lower.includes('guest')) return true;
    return isUuid(id) && toUuid(id) === GUEST_PROFILE_ID;
  }

  // Citizen-scoped guard: a logged-in user may only read their own data; the
  // shared guest demo stays usable only for unauthenticated sessions.
  function assertCitizenScope(req: express.Request, res: express.Response, targetCitizenId?: string): boolean {
    const authId = requestAuthId(req);
    if (isGuestProfileRef(targetCitizenId)) {
      if (authId) {
        res.status(403).json({ success: false, error: "Forbidden: you can only access your own data." });
        return false;
      }
      return true;
    }
    if (!authId) {
      res.status(401).json({ success: false, error: "Login zaroori hai. Please sign in first." });
      return false;
    }
    if (targetCitizenId && String(targetCitizenId) !== authId && toUuid(String(targetCitizenId)) !== toUuid(authId)) {
      res.status(403).json({ success: false, error: "Forbidden: you can only access your own data." });
      return false;
    }
    return true;
  }

  async function lawyerHasActiveConnection(lawyerRowId: string, caseId: string): Promise<boolean> {
    if (!supabaseAdmin) return false;
    try {
      const { data } = await supabaseAdmin
        .from('lawyer_connections')
        .select('id')
        .eq('lawyer_id', lawyerRowId)
        .eq('case_id', caseId)
        .in('status', ['accepted', 'completed'])
        .maybeSingle();
      return Boolean(data?.id);
    } catch (_e) {
      return false;
    }
  }

  // Case-scoped guard: the caller must own the case OR be an accepted/completed
  // lawyer on it. Unauthenticated callers may only read the shared guest demo case.
  async function assertCaseAccess(req: express.Request, res: express.Response, caseId?: string): Promise<boolean> {
    if (!caseId || !supabaseAdmin) {
      res.status(400).json({ success: false, error: "caseId required" });
      return false;
    }
    const dbCaseId = toUuid(caseId);
    const { data: caseRow } = await supabaseAdmin
      .from('cases')
      .select('id, citizen_id, assigned_lawyer_id')
      .in('id', Array.from(new Set([caseId, dbCaseId].filter(isUuid))))
      .maybeSingle();
    if (!caseRow?.id) {
      res.status(404).json({ success: false, error: "Case not found." });
      return false;
    }

    const authId = requestAuthId(req);
    if (!authId) {
      if (isGuestProfileRef(caseRow.citizen_id)) return true;
      res.status(401).json({ success: false, error: "Login zaroori hai. Please sign in first." });
      return false;
    }

    if (caseRow.citizen_id === authId) return true;

    const myLawyerRowId = await serverResolveLawyerId(authId);
    if (myLawyerRowId) {
      const isAssigned = isUuid(caseRow.assigned_lawyer_id) && caseRow.assigned_lawyer_id === myLawyerRowId;
      if (isAssigned || (await lawyerHasActiveConnection(myLawyerRowId, caseRow.id))) {
        return true;
      }
    }

    res.status(403).json({ success: false, error: "Forbidden: you can only access your own case." });
    return false;
  }

  // Direct-message guard: the caller must be the citizen OR the connected lawyer.
  async function assertConnectionAccess(req: express.Request, res: express.Response, connRow: any): Promise<boolean> {
    const authId = requestAuthId(req);
    if (!authId) {
      if (isGuestProfileRef(connRow?.citizen_id)) return true;
      res.status(401).json({ success: false, error: "Login zaroori hai. Please sign in first." });
      return false;
    }
    if (connRow?.citizen_id === authId) return true;
    const myLawyerRowId = await serverResolveLawyerId(authId);
    if (myLawyerRowId && connRow?.lawyer_id === myLawyerRowId) return true;
    res.status(403).json({ success: false, error: "Forbidden: you can only access your own connection." });
    return false;
  }

  app.get("/api/db/messages", async (req, res) => {
    try {
      const caseId = req.query.caseId as string;
      if (!caseId) return res.json({ success: true, messages: [] });

      if (!(await assertCaseAccess(req, res, caseId))) return;

      const dbCaseId = toUuid(caseId);
      const targetIds = Array.from(new Set([caseId, dbCaseId].filter(isUuid)));

      if (!supabaseAdmin) return res.json({ success: false, messages: [] });

      const { data, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .in('case_id', targetIds)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return res.json({ success: true, messages: data || [] });
    } catch (err: any) {
      console.warn("/api/db/messages GET error:", err.message);
      return res.json({ success: false, messages: [] });
    }
  });

  app.post("/api/db/messages/save", optionalAuth, async (req, res) => {
    try {
      const { case_id, sender_type, content, message_type = 'text', citizen_id = 'guest_citizen', language: providedLanguage } = req.body;
      if (!case_id || !content) return res.status(400).json({ error: "case_id and content are required" });

      if (!(await assertCaseAccess(req, res, case_id))) return;

      let detectedLang = providedLanguage || "hi";
      if (!providedLanguage) {
        try {
          const det = detectLanguageWithStats(String(content).trim());
          detectedLang = (det.confidence || 0) >= 0.5 ? det.language : detectedLang;
        } catch (_e) { /* keep default */ }
      }

      if (supabaseAdmin) {
        const dbCaseId = await serverEnsureCase(case_id, citizen_id);
        const msgObj = {
          id: crypto.randomUUID(),
          case_id: dbCaseId,
          sender_type: sender_type === 'user' ? 'user' : 'ai',
          content: String(content).trim(),
          message_type: message_type || 'text',
          language: detectedLang,
          created_at: new Date().toISOString(),
        };

        const { data, error } = await supabaseAdmin
          .from('messages')
          .insert(msgObj)
          .select('*')
          .single();

        if (!error && data) {
          return res.json({ success: true, message: data });
        } else if (error) {
          console.warn("/api/db/messages/save insert error:", error.message);
          return res.status(500).json({ success: false, error: error.message });
        }
        return res.json({ success: true, message: msgObj });
      }

      return res.json({ success: true, message: { id: crypto.randomUUID(), case_id, sender_type, content, message_type, language: detectedLang, created_at: new Date().toISOString() } });
    } catch (err: any) {
      console.error("/api/db/messages/save error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/db/cases", async (req, res) => {
    try {
      const requestedCitizenId = (req.query.citizenId as string) || 'guest_citizen';
      const requestedCaseId = req.query.caseId as string | undefined;

      // Case-by-id lookup shares this endpoint; scope it to the case owner/lawyer.
      if (requestedCaseId) {
        if (!(await assertCaseAccess(req, res, requestedCaseId))) return;
        if (!supabaseAdmin) return res.json({ success: false, cases: [] });
        const dbCaseId = toUuid(requestedCaseId);
        const { data } = await supabaseAdmin
          .from('cases')
          .select('*')
          .in('id', Array.from(new Set([requestedCaseId, dbCaseId].filter(isUuid))))
          .maybeSingle();
        return res.json({ success: true, cases: data ? [data] : [] });
      }

      if (!assertCitizenScope(req, res, requestedCitizenId)) return;
      if (!supabaseAdmin) return res.json({ success: false, cases: [] });

      const authId = requestAuthId(req);
      let targetIds: string[];
      if (authId) {
        const dbAuthId = await serverEnsureProfile(authId);
        targetIds = Array.from(new Set([authId, dbAuthId].filter(isUuid)));
      } else {
        const guestDbId = await serverEnsureProfile('guest_citizen');
        targetIds = Array.from(
          new Set([
            guestDbId,
            GUEST_PROFILE_ID,
            'cfabc5e6-1924-451e-8cc7-afc493f4e239',
            'guest_citizen',
            'guest'
          ].filter(isUuid))
        );
      }

      let { data, error } = await supabaseAdmin
        .from('cases')
        .select('*')
        .in('citizen_id', targetIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("/api/db/cases GET query notice:", error.message);
      }

      return res.json({ success: true, cases: data || [] });
    } catch (err: any) {
      console.warn("/api/db/cases GET exception:", err.message);
      return res.json({ success: false, cases: [] });
    }
  });

  app.post("/api/db/cases/save", requireAuth, async (req, res) => {
    try {
      const { id, citizen_id, title, category = 'other', status = 'ongoing', ai_verdict = 'needs_more_info', ai_summary, confidence_score, citizen_note } = req.body;
      if (!citizen_id) return res.status(400).json({ error: "citizen_id is required" });

      // Ownership guard: a logged-in user may only create/update their own cases.
      const authReq = req as AuthedRequest;
      if (authReq.supabaseUserId && isUuid(citizen_id) && citizen_id !== authReq.supabaseUserId) {
        return res.status(403).json({ success: false, error: "Forbidden: you can only manage your own cases." });
      }

      // Active case cap: only enforce when creating a new case (no existing id)
      const ACTIVE_CASE_LIMIT = 2;
      const ACTIVE_CASE_STATUSES = ['ongoing', 'assessed', 'lawyer_connected'];
      if (!id && supabaseAdmin && (status === 'ongoing' || !status)) {
        const validCitizenForCount = await serverEnsureProfile(citizen_id);
        const authId = requestAuthId(req);
        const countIds = Array.from(new Set([citizen_id, validCitizenForCount, authId].filter(isUuid)));
        const { data: existingCases } = await supabaseAdmin
          .from('cases')
          .select('status')
          .in('citizen_id', countIds);
        const activeCount = (existingCases || []).filter((c: any) => ACTIVE_CASE_STATUSES.includes(c.status)).length;
        if (activeCount >= ACTIVE_CASE_LIMIT) {
          return res.status(409).json({ success: false, error: "ACTIVE_CASE_LIMIT_REACHED", message: "Maximum 2 active cases allowed. Close an existing case before creating a new one." });
        }
      }

      const caseId = id ? toUuid(id) : crypto.randomUUID();
      const validCitizenId = await serverEnsureProfile(citizen_id);

      const caseData: any = {
        id: caseId,
        citizen_id: validCitizenId,
        title: title || 'Naya Legal Query',
        category: category || 'other',
        status: status || 'ongoing',
        ai_verdict: ai_verdict || 'needs_more_info',
        ai_summary: ai_summary || null,
        confidence_score: confidence_score ?? 0.5,
        updated_at: new Date().toISOString(),
      };
      if (citizen_note) caseData.citizen_note = citizen_note;

      if (supabaseAdmin) {
        let { data, error } = await supabaseAdmin
          .from('cases')
          .upsert(caseData, { onConflict: 'id' })
          .select('*')
          .single();
        if (error && citizen_note && (error.message?.includes('citizen_note') || error.message?.includes('column') || error.code === '42703')) {
          delete caseData.citizen_note;
          const retry = await supabaseAdmin.from('cases').upsert(caseData, { onConflict: 'id' }).select('*').single();
          data = retry.data;
          error = retry.error;
        }

        if (!error && data) {
          return res.json({ success: true, case: data });
        }
        if (error) {
          console.warn("/api/db/cases/save error:", error.message);
          return res.status(500).json({ success: false, error: error.message });
        }
      }

      return res.status(500).json({ success: false, error: "Supabase admin client not configured" });
    } catch (err: any) {
      console.error("/api/db/cases/save exception:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/db/cases/status", requireAuth, async (req, res) => {
    try {
      const { caseId, status, ai_verdict, ai_summary, confidence_score } = req.body;
      if (!caseId) return res.status(400).json({ error: "caseId required" });

      const dbCaseId = toUuid(caseId);

      // Cap check on reopen: when changing from closed to a non-closed status
      const ACTIVE_CASE_LIMIT = 2;
      const ACTIVE_CASE_STATUSES = ['ongoing', 'assessed', 'lawyer_connected'];
      if (status && ACTIVE_CASE_STATUSES.includes(status) && supabaseAdmin) {
        const { data: currentCase } = await supabaseAdmin
          .from('cases')
          .select('status, citizen_id')
          .in('id', Array.from(new Set([caseId, dbCaseId].filter(isUuid))))
          .maybeSingle();

        if (currentCase && currentCase.status === 'closed') {
          const validCitizenId = await serverEnsureProfile(currentCase.citizen_id);
          const countIds = Array.from(new Set([currentCase.citizen_id, validCitizenId].filter(isUuid)));
          const { data: existingCases } = await supabaseAdmin
            .from('cases')
            .select('status')
            .in('citizen_id', countIds);
          const activeCount = (existingCases || []).filter((c: any) => ACTIVE_CASE_STATUSES.includes(c.status)).length;
          if (activeCount >= ACTIVE_CASE_LIMIT) {
            return res.status(409).json({ success: false, error: "ACTIVE_CASE_LIMIT_REACHED", message: "Cannot reopen: maximum 2 active cases allowed." });
          }
        }
      }

      const updateData: any = { updated_at: new Date().toISOString() };
      if (status) updateData.status = status;
      if (ai_verdict) updateData.ai_verdict = ai_verdict;
      if (ai_summary !== undefined) updateData.ai_summary = ai_summary;
      if (confidence_score !== undefined) updateData.confidence_score = confidence_score;

      if (supabaseAdmin) {
        await supabaseAdmin.from('cases').update(updateData).in('id', Array.from(new Set([caseId, dbCaseId].filter(isUuid))));
      }

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/db/documents", async (req, res) => {
    try {
      const caseId = req.query.caseId as string;
      if (!caseId) return res.json({ success: true, documents: [] });

      if (!(await assertCaseAccess(req, res, caseId))) return;

      const dbCaseId = toUuid(caseId);
      const targetIds = Array.from(new Set([caseId, dbCaseId].filter(isUuid)));

      if (!supabaseAdmin) return res.json({ success: false, documents: [] });

      const { data, error } = await supabaseAdmin
        .from('documents')
        .select('*')
        .in('case_id', targetIds)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return res.json({ success: true, documents: data || [] });
    } catch (err: any) {
      return res.json({ success: false, documents: [] });
    }
  });

  app.post("/api/db/documents/save", optionalAuth, async (req, res) => {
    try {
      const { id, case_id, file_url, document_type, ai_extracted_text, ai_summary, ai_analysis, is_verified, is_verified_valid, citizen_id } = req.body;
      if (!case_id) return res.status(400).json({ error: "case_id required" });

      const docId = id ? toUuid(id) : crypto.randomUUID();

      if (supabaseAdmin) {
        const { data: existingDoc } = await supabaseAdmin.from('documents').select('*').eq('id', docId).maybeSingle();

        const safeDocType = sanitizeDbDocumentType(document_type);
        const updateData: any = {};
        if (file_url !== undefined) updateData.file_url = file_url;
        if (document_type !== undefined) updateData.document_type = safeDocType;
        if (ai_extracted_text !== undefined) updateData.ai_extracted_text = ai_extracted_text;
        if (ai_analysis !== undefined || ai_summary !== undefined) updateData.ai_analysis = ai_analysis ?? ai_summary ?? null;
        if (is_verified_valid !== undefined || is_verified !== undefined) updateData.is_verified_valid = is_verified_valid ?? is_verified ?? false;

        if (existingDoc) {
          if (!(await assertCaseAccess(req, res, existingDoc.case_id))) return;
          const { data, error } = await supabaseAdmin.from('documents').update(updateData).eq('id', docId).select('*').single();
          if (error) {
            console.error("Error updating document in server endpoint:", error);
            return res.status(500).json({ error: error.message });
          }
          return res.json({ success: true, document: data });
        } else {
          if (!(await assertCaseAccess(req, res, case_id))) return;
          const resolvedCaseId = await serverEnsureCase(case_id, citizen_id || 'guest_citizen');
          const docObj = {
            id: docId,
            case_id: resolvedCaseId,
            file_url: file_url || '',
            document_type: safeDocType,
            ai_extracted_text: ai_extracted_text || null,
            ai_analysis: ai_analysis ?? ai_summary ?? null,
            is_verified_valid: is_verified_valid ?? is_verified ?? false,
            uploaded_at: new Date().toISOString(),
          };
          const { data, error } = await supabaseAdmin.from('documents').insert(docObj).select('*').single();
          if (error) {
            console.error("Error inserting document in server endpoint:", error);
            return res.status(500).json({ error: error.message });
          }
          return res.json({ success: true, document: data });
        }
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Server document save catch error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/db/documents/:id", optionalAuth, async (req, res) => {
    try {
      const docId = req.params.id;
      if (!docId) return res.status(400).json({ error: "id required" });

      if (supabaseAdmin) {
        const dbDocId = toUuid(docId);
        const lookupIds = Array.from(new Set([docId, dbDocId].filter(isUuid)));
        const { data: docRow } = await supabaseAdmin.from('documents').select('case_id').in('id', lookupIds).maybeSingle();
        if (!docRow) return res.status(404).json({ error: "Document not found" });
        if (!(await assertCaseAccess(req, res, docRow.case_id))) return;
        await supabaseAdmin.from('documents').delete().in('id', lookupIds);
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/db/facts", async (req, res) => {
    try {
      const caseId = req.query.caseId as string;
      const profileId = req.query.profileId as string;

      if (caseId && supabaseAdmin) {
        if (!(await assertCaseAccess(req, res, caseId))) return;
        const dbCaseId = toUuid(caseId);
        const { data } = await supabaseAdmin.from('case_facts').select('*').in('case_id', Array.from(new Set([caseId, dbCaseId].filter(isUuid))));
        return res.json({ success: true, facts: data || [] });
      }

      if (profileId && supabaseAdmin) {
        if (!assertCitizenScope(req, res, profileId)) return;
        const dbProfId = toUuid(profileId);
        const { data } = await supabaseAdmin.from('profile_facts').select('*').in('profile_id', Array.from(new Set([profileId, dbProfId].filter(isUuid))));
        return res.json({ success: true, facts: data || [] });
      }

      return res.json({ success: true, facts: [] });
    } catch (err: any) {
      return res.json({ success: false, facts: [] });
    }
  });

  app.post("/api/db/facts/save", optionalAuth, async (req, res) => {
    try {
      const { case_id, profile_id, key, value, citizen_id } = req.body;
      if (!key || !value) return res.status(400).json({ error: "key and value required" });

      if (supabaseAdmin) {
        const nowIso = new Date().toISOString();
        if (case_id) {
          if (!(await assertCaseAccess(req, res, case_id))) return;
          const dbCaseId = await serverEnsureCase(case_id, citizen_id || 'guest_citizen');
          await supabaseAdmin.from('case_facts').upsert(
            { case_id: dbCaseId, fact_key: key, fact_value: value, updated_at: nowIso },
            { onConflict: 'case_id,fact_key' }
          );
        }
        if (profile_id) {
          if (!assertCitizenScope(req, res, profile_id)) return;
          const dbProfId = await serverEnsureProfile(profile_id);
          await supabaseAdmin.from('profile_facts').upsert(
            { profile_id: dbProfId, fact_key: key, fact_value: value, updated_at: nowIso },
            { onConflict: 'profile_id,fact_key' }
          );
        }
      }
      return res.json({ success: true });
    } catch (err: any) {
      console.error("Server facts save catch error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/db/evidence", async (req, res) => {
    try {
      const caseId = req.query.caseId as string;
      if (!caseId || !supabaseAdmin) return res.json({ success: true, evidence: [] });

      if (!(await assertCaseAccess(req, res, caseId))) return;

      const dbCaseId = toUuid(caseId);
      const { data } = await supabaseAdmin.from('case_evidence').select('*').in('case_id', Array.from(new Set([caseId, dbCaseId].filter(isUuid))));
      return res.json({ success: true, evidence: data || [] });
    } catch (err: any) {
      return res.json({ success: false, evidence: [] });
    }
  });

  app.post("/api/db/evidence/save", optionalAuth, async (req, res) => {
    try {
      const { case_id, title, description, priority = 'helpful', citizen_id } = req.body;
      const evidenceDescription = String(description || title || '').trim();
      if (!case_id || !evidenceDescription) return res.status(400).json({ error: "case_id and evidence text required" });

      if (!(await assertCaseAccess(req, res, case_id))) return;

      const dbCaseId = toUuid(case_id);
      const safePriority = (priority === 'critical' || priority === 'optional') ? priority : 'helpful';
      const evObj = {
        id: crypto.randomUUID(),
        case_id: dbCaseId,
        evidence_description: evidenceDescription,
        is_available: false,
        priority: safePriority,
      };

      if (supabaseAdmin) {
        await serverEnsureCase(case_id, citizen_id || 'guest_citizen');
        const { data } = await supabaseAdmin.from('case_evidence').insert(evObj).select('*').single();
        if (data) return res.json({ success: true, evidence: data });
      }

      return res.json({ success: true, evidence: evObj });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/db/connections", optionalAuth, async (req, res) => {
    try {
      const citizenId = req.query.citizenId as string;
      const lawyerId = req.query.lawyerId as string;

      if (!supabaseAdmin) return res.json({ success: false, connections: [] });

      if (citizenId) {
        if (!assertCitizenScope(req, res, citizenId)) return;
        const dbCitId = toUuid(citizenId);
        const { data } = await supabaseAdmin
          .from('lawyer_connections')
          .select('*, case:cases(*), lawyer:lawyers!lawyer_connections_lawyer_id_fkey(*, profile:profiles(*))')
          .in('citizen_id', Array.from(new Set([citizenId, dbCitId].filter(isUuid))))
          .order('requested_at', { ascending: false });

        const deduped = dedupeConnections(data || []);
        return res.json({ success: true, connections: deduped });
      }

      if (lawyerId) {
        const authId = requestAuthId(req);
        if (!authId) {
          return res.status(401).json({ success: false, error: "Login zaroori hai. Please sign in first." });
        }
        const myRowId = await serverResolveLawyerId(authId);
        if (!myRowId) {
          return res.status(403).json({ success: false, error: "Forbidden: lawyer profile not found." });
        }
        const requestedRowId = await serverResolveLawyerId(lawyerId);
        if (!requestedRowId || requestedRowId !== myRowId) {
          return res.status(403).json({ success: false, error: "Forbidden: you can only access your own connections." });
        }
        const dbLawId = toUuid(lawyerId);
        const targetLawyerIds = Array.from(
          new Set([requestedRowId, lawyerId, dbLawId].filter(isUuid))
        );
        const { data } = await supabaseAdmin
          .from('lawyer_connections')
          .select('*, case:cases(*), citizen_profile:profiles!lawyer_connections_citizen_id_fkey(*)')
          .in('lawyer_id', targetLawyerIds)
          .order('requested_at', { ascending: false });

        return res.json({ success: true, connections: data || [] });
      }

      return res.json({ success: true, connections: [] });
    } catch (err: any) {
      return res.json({ success: false, connections: [] });
    }
  });

  app.post("/api/db/connections/save", requireAuth, async (req, res) => {
    try {
      const citizen_id = req.body.citizen_id || req.body.citizenId;
      const lawyer_id = req.body.lawyer_id || req.body.lawyerId;
      let case_id = req.body.case_id || req.body.caseId;

      if (!citizen_id || !lawyer_id) return res.status(400).json({ error: "citizen_id and lawyer_id are required" });

      const requestNote = req.body.request_note || null;

      // Ownership guard: only the authenticated citizen may request a connection.
      const authReq = req as AuthedRequest;
      if (authReq.supabaseUserId && isUuid(citizen_id) && citizen_id !== authReq.supabaseUserId) {
        return res.status(403).json({ success: false, error: "Forbidden: you can only request a connection as yourself." });
      }

      const dbCitizenId = await serverEnsureProfile(citizen_id);
      const dbLawyerId = await serverResolveLawyerId(lawyer_id);
      if (!dbLawyerId) {
        return res.status(400).json({ success: false, error: "Lawyer not found" });
      }

      if (supabaseAdmin) {
        const { data: existingPending } = await supabaseAdmin
          .from('lawyer_connections')
          .select('id')
          .eq('citizen_id', dbCitizenId)
          .eq('lawyer_id', dbLawyerId)
          .eq('status', 'requested')
          .maybeSingle();

        if (existingPending) {
          return res.status(409).json({ success: false, error: "ALREADY_REQUESTED", message: "You already have a pending request with this advocate." });
        }
      }

      const dbCaseId = await serverEnsureCase(case_id || 'active_case', citizen_id);
      const connectionId = crypto.randomUUID();

      const baseConnObj: Record<string, any> = {
        id: connectionId,
        case_id: dbCaseId,
        citizen_id: dbCitizenId,
        lawyer_id: dbLawyerId,
        status: normalizeConnectionStatus(req.body.status || 'requested'),
        requested_at: new Date().toISOString(),
      };
      if (requestNote) baseConnObj.request_note = requestNote;

      if (supabaseAdmin) {
        let { data, error } = await supabaseAdmin.from('lawyer_connections').upsert(baseConnObj, { onConflict: 'id' }).select('*').single();
        if (error && requestNote && (error.message?.includes('request_note') || error.message?.includes('column') || error.code === '42703')) {
          delete baseConnObj.request_note;
          const retry = await supabaseAdmin.from('lawyer_connections').upsert(baseConnObj, { onConflict: 'id' }).select('*').single();
          data = retry.data;
          error = retry.error;
        }
        if (data) {
          // Auto-generate case summary if not exists (for lawyer request brief)
          try {
            const { data: existingSummary } = await supabaseAdmin
              .from('case_summaries')
              .select('id')
              .eq('case_id', dbCaseId)
              .limit(1)
              .maybeSingle();

            if (!existingSummary) {
              // Gather case data for summary generation
              const { data: caseRow } = await supabaseAdmin.from('cases').select('*').eq('id', dbCaseId).maybeSingle();
              const { data: facts } = await supabaseAdmin.from('case_facts').select('*').eq('case_id', dbCaseId);
              const { data: docs } = await supabaseAdmin.from('documents').select('*').eq('case_id', dbCaseId);
              const { data: evidence } = await supabaseAdmin.from('case_evidence').select('*').eq('case_id', dbCaseId);

              const factsMap: Record<string, string> = {};
              (facts || []).forEach((f: any) => { factsMap[f.fact_key] = f.fact_value; });

              const category = (caseRow?.category || 'other').charAt(0).toUpperCase() + (caseRow?.category || 'other').slice(1);
              const title = caseRow?.title || 'Legal Case';
              const location = factsMap['city'] || factsMap['state'] || factsMap['location'] || 'Not specified';
              const keyFacts = (facts || []).map((f: any) => `${f.fact_key}: ${f.fact_value}`);
              const documentsList = (docs || []).map((d: any) => {
                const name = d.file_url ? decodeURIComponent(d.file_url.split('/').pop()?.replace(/^.*_/, '') || 'Document') : 'Document';
                return `${name} (${(d.document_type || 'unknown').replace(/_/g, ' ')})`;
              });
              const evidenceList = (evidence || []).map((e: any) => e.evidence_description);

              const missingInfo: string[] = [];
              if (!factsMap['incident_date']) missingInfo.push('Exact incident date');
              if (!factsMap['opposite_party_name'] && !factsMap['opposite_party']) missingInfo.push('Opposite party details');
              if (!docs || docs.length === 0) missingInfo.push('Supporting documents');

              const executiveSummary = [
                `This is a ${category.toLowerCase()} matter involving "${title}".`,
                factsMap['complainant_name'] ? `The complainant is ${factsMap['complainant_name']}.` : '',
                factsMap['opposite_party_name'] || factsMap['opposite_party'] ? `The opposite party is ${factsMap['opposite_party_name'] || factsMap['opposite_party']}.` : '',
                factsMap['incident_date'] ? `The incident occurred on ${factsMap['incident_date']}.` : '',
                `Matter is based in ${location}.`,
                caseRow?.ai_summary ? `AI Analysis: ${caseRow.ai_summary}` : '',
              ].filter(Boolean).join(' ');

              const shortBrief = [
                `CASE TYPE: ${category} Dispute`,
                `TITLE: ${title}`,
                `LOCATION: ${location}`,
                '',
                executiveSummary.substring(0, 500),
                '',
                `Documents: ${documentsList.length} | Evidence: ${evidenceList.length} | Facts: ${(facts || []).length}`,
              ].join('\n');

              const score = Math.min(95, 40 + ((docs && docs.length > 0) ? 10 : 0) + ((evidence && evidence.length > 0) ? 10 : 0) + ((facts && facts.length > 3) ? 5 : 0) + 10);

              const reportId = `MWA-RPT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

              await supabaseAdmin.from('case_summaries').insert({
                id: crypto.randomUUID(),
                case_id: dbCaseId,
                version: 1,
                case_title: title,
                case_category: caseRow?.category || 'other',
                incident_date: factsMap['incident_date'] || null,
                location,
                complainant_name: factsMap['complainant_name'] || factsMap['full_name'] || null,
                opposite_party_name: factsMap['opposite_party_name'] || factsMap['opposite_party'] || null,
                executive_summary: executiveSummary,
                key_facts: keyFacts,
                documents_list: documentsList,
                evidence_list: evidenceList,
                case_strength_score: score,
                report_id: reportId,
                report_status: 'REQUEST_SENT',
                short_brief: shortBrief,
                missing_information: missingInfo,
                questions_for_lawyer: ['Verify documents', 'Confirm timeline'],
                ai_generated_at: new Date().toISOString(),
                ai_last_updated_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

              // Update connection with summary version
              await supabaseAdmin.from('lawyer_connections').update({ case_summary_version: 1 }).eq('id', connectionId);
            } else {
              // Update status to REQUEST_SENT
              await supabaseAdmin
                .from('case_summaries')
                .update({ report_status: 'REQUEST_SENT', updated_at: new Date().toISOString() })
                .eq('case_id', dbCaseId)
                .order('version', { ascending: false })
                .limit(1);
            }
          } catch (summaryErr) {
            console.warn('[CASE-SUMMARY] Auto-generation notice:', summaryErr);
          }

          const smsSent = await notifyLawyerOfRequest(dbLawyerId, dbCitizenId, dbCaseId);
          try {
            await trackAnalyticsEvent('lawyer_request_received', { lawyer_id: dbLawyerId, citizen_id: dbCitizenId, case_id: dbCaseId });
          } catch (analyticsErr) {
            console.warn('[MERA-FIX] analytics track error:', analyticsErr);
          }
          return res.json({ success: true, connection: data, sms_sent: smsSent });
        }
        if (error) {
          console.warn("/api/db/connections/save error:", error.message);
          return res.status(500).json({ success: false, error: error.message });
        }
      }

      return res.status(500).json({ success: false, error: "Supabase admin client not configured" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/db/connections/status", requireAuth, async (req, res) => {
    try {
      const { connectionId, caseId, lawyerId, citizenId, status } = req.body;
      if (!connectionId || !status) return res.status(400).json({ error: "Missing parameters" });

      // Ownership guard: only the lawyer receiving the request may accept/reject it.
      const authReq = req as AuthedRequest;
      if (authReq.supabaseUserId && supabaseAdmin) {
        const myRowId = await serverResolveLawyerId(authReq.supabaseUserId);
        if (!myRowId) {
          return res.status(403).json({ success: false, error: "Forbidden: lawyer profile not found." });
        }
        const { data: connRow } = await supabaseAdmin
          .from('lawyer_connections')
          .select('lawyer_id')
          .in('id', Array.from(new Set([connectionId, toUuid(connectionId)].filter(isUuid))))
          .maybeSingle();
        if (connRow && connRow.lawyer_id !== myRowId) {
          return res.status(403).json({ success: false, error: "Forbidden: you can only respond to your own connections." });
        }
      }

      const dbStatus = normalizeConnectionStatus(status);
      const dbConnId = toUuid(connectionId);

      if (supabaseAdmin) {
        // Handle decline reason
        const declineReason = req.body.decline_reason || null;
        const updatePayload: any = { status: dbStatus };
        if (dbStatus === 'rejected' && declineReason) updatePayload.decline_reason = declineReason;

        await supabaseAdmin.from('lawyer_connections').update(updatePayload).in('id', Array.from(new Set([connectionId, dbConnId].filter(isUuid))));

        if (dbStatus === 'accepted' && caseId) {
          const dbCaseId = toUuid(caseId);
          const validLawyerId = (await serverResolveLawyerId(lawyerId)) || toUuid(lawyerId);
          await supabaseAdmin.from('cases').update({ assigned_lawyer_id: validLawyerId, status: 'lawyer_connected' }).in('id', Array.from(new Set([caseId, dbCaseId].filter(isUuid))));

          // Update case summary: unlock full report for accepted lawyer
          try {
            const { data: lawyerProfile } = await supabaseAdmin
              .from('lawyers')
              .select('id, profile:profiles(full_name)')
              .or(`id.eq.${validLawyerId},profile_id.eq.${validLawyerId}`)
              .maybeSingle();
            const lawyerName = (lawyerProfile as any)?.profile?.full_name || 'Advocate';

            await supabaseAdmin
              .from('case_summaries')
              .update({
                report_status: 'FULL_REPORT_UNLOCKED',
                lawyer_request_status: 'accepted',
                assigned_lawyer_id: validLawyerId,
                assigned_lawyer_name: lawyerName,
                lawyer_accepted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('case_id', caseId)
              .order('version', { ascending: false })
              .limit(1);
          } catch (summaryErr) {
            console.warn('[CASE-SUMMARY] Accept update notice:', summaryErr);
          }
        }

        if (dbStatus === 'rejected' && caseId) {
          // Update case summary: lawyer declined
          try {
            await supabaseAdmin
              .from('case_summaries')
              .update({
                report_status: 'DECLINED',
                lawyer_request_status: 'declined',
                updated_at: new Date().toISOString(),
              })
              .eq('case_id', caseId)
              .order('version', { ascending: false })
              .limit(1);
          } catch (summaryErr) {
            console.warn('[CASE-SUMMARY] Decline update notice:', summaryErr);
          }
        }
      }

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/db/direct-messages", requireAuth, async (req, res) => {
    try {
      const connectionId = req.query.connectionId as string;
      if (!connectionId || !supabaseAdmin) return res.json({ success: true, messages: [] });

      const dbConnId = toUuid(connectionId);
      const { data: connRow } = await supabaseAdmin
        .from('lawyer_connections')
        .select('id, citizen_id, lawyer_id')
        .in('id', Array.from(new Set([connectionId, dbConnId].filter(isUuid))))
        .maybeSingle();
      if (!connRow?.id) return res.json({ success: true, messages: [] });
      if (!(await assertConnectionAccess(req, res, connRow))) return;

      const { data } = await supabaseAdmin
        .from('direct_messages')
        .select('*')
        .in('connection_id', Array.from(new Set([connectionId, dbConnId].filter(isUuid))))
        .order('sent_at', { ascending: true });

      return res.json({ success: true, messages: data || [] });
    } catch (err: any) {
      return res.json({ success: false, messages: [] });
    }
  });

  app.post("/api/db/direct-messages/send", requireAuth, async (req, res) => {
    try {
      const { connection_id, sender_id, sender_type, content, attachment_url, attachment_type, attachment_name } = req.body;
      if (!connection_id) return res.status(400).json({ error: "Missing parameters" });
      if (!content && !attachment_url) return res.status(400).json({ error: "Content or attachment required" });

      const dbConnId = toUuid(connection_id);
      if (supabaseAdmin) {
        const { data: connRow } = await supabaseAdmin
          .from('lawyer_connections')
          .select('id, citizen_id, lawyer_id, status, case_id')
          .in('id', Array.from(new Set([connection_id, dbConnId].filter(isUuid))))
          .maybeSingle();
        if (connRow?.id && !(await assertConnectionAccess(req, res, connRow))) return;
        if (connRow?.id && connRow.status !== 'accepted') {
          return res.status(403).json({ success: false, error: "Connection not yet accepted. Messages can only be sent after the advocate accepts the request." });
        }

        // Lock chat if the associated case is closed
        if (connRow?.case_id) {
          const { data: caseRow } = await supabaseAdmin
            .from('cases')
            .select('status')
            .in('id', Array.from(new Set([connRow.case_id, toUuid(connRow.case_id)].filter(isUuid))))
            .maybeSingle();
          if (caseRow?.status === 'closed') {
            return res.status(403).json({ success: false, error: "CASE_CLOSED", message: "This case has been closed. Chat is locked. Reopen the case to continue messaging." });
          }
        }
      }

      const allowedTypes = ['image/', 'application/pdf'];
      if (attachment_url && attachment_type) {
        if (!allowedTypes.some((t) => attachment_type.startsWith(t) || attachment_type === 'application/pdf')) {
          return res.status(400).json({ error: "Unsupported attachment type" });
        }
      }

      const msgObj = {
        id: crypto.randomUUID(),
        connection_id: dbConnId,
        sender_id: sender_id || 'user',
        sender_type: sender_type || 'citizen',
        content: content ? String(content).trim() : null,
        attachment_url: attachment_url || null,
        attachment_type: attachment_type || null,
        attachment_name: attachment_name || null,
        sent_at: new Date().toISOString(),
      };

      if (supabaseAdmin) {
        const { data } = await supabaseAdmin.from('direct_messages').insert(msgObj).select('*').single();
        if (data) return res.json({ success: true, message: data });
      }

      return res.json({ success: true, message: msgObj });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/db/lawyers", async (req, res) => {
    try {
      if (!supabaseAdmin) return res.json({ success: false, lawyers: [] });

      if (!adminUsesServiceRole) {
        console.warn('[MERA-WARN] GET /api/db/lawyers: SUPABASE_SERVICE_ROLE_KEY is missing or invalid; running on anon key. Profile joins may be incomplete without the RLS fix (migration 004).');
      }

      const { data } = await supabaseAdmin
        .from('lawyers')
        .select('*, profile:profiles(*)')
        .order('rating_avg', { ascending: false });

      const lawyersWithReviews = (data || []).map((lawyer: any) => ({ ...lawyer, review_count: 0 }));
      if (data && data.length > 0) {
        const { data: reviewRows } = await supabaseAdmin
          .from('reviews')
          .select('lawyer_id')
          .in('lawyer_id', data.map((l: any) => l.id));
        if (reviewRows && reviewRows.length > 0) {
          const counts: Record<string, number> = {};
          reviewRows.forEach((r: any) => { counts[r.lawyer_id] = (counts[r.lawyer_id] || 0) + 1; });
          lawyersWithReviews.forEach((l: any) => { l.review_count = counts[l.id] || 0; });
        }
      }

      return res.json({ success: true, lawyers: lawyersWithReviews });
    } catch (err: any) {
      return res.json({ success: false, lawyers: [] });
    }
  });

  app.post("/api/db/lawyers/update", requireAuth, async (req, res) => {
    try {
      const {
        userId,
        profile_photo_url,
        bar_council_number,
        specialty,
        years_experience,
        bio,
        consultation_fee_range,
        courts,
        city,
        state
      } = req.body;

      if (!userId || !supabaseAdmin) {
        return res.status(400).json({ success: false, error: "userId is required" });
      }

      // Ownership guard: a lawyer may only update their own lawyer record.
      const authReq = req as AuthedRequest;
      if (authReq.supabaseUserId && isUuid(userId) && userId !== authReq.supabaseUserId) {
        return res.status(403).json({ success: false, error: "Forbidden: you can only update your own lawyer profile." });
      }

      const dbUserId = await serverEnsureProfile(userId);
      const targetIds = Array.from(new Set([userId, dbUserId, toUuid(userId)].filter(isUuid)));

      if (city || state) {
        await supabaseAdmin
          .from('profiles')
          .update({
            city: city || undefined,
            state: state || undefined,
            updated_at: new Date().toISOString()
          })
          .in('id', targetIds);
      }

      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (profile_photo_url !== undefined) updatePayload.profile_photo_url = profile_photo_url;
      if (bar_council_number !== undefined) updatePayload.bar_council_number = bar_council_number;
      if (bio !== undefined) updatePayload.bio = bio;
      if (consultation_fee_range !== undefined) updatePayload.consultation_fee_range = consultation_fee_range;
      if (years_experience !== undefined) {
        const parsedExp = parseInt(years_experience, 10);
        if (!isNaN(parsedExp)) updatePayload.years_experience = parsedExp;
      }
      if (specialty !== undefined) {
        updatePayload.specialty = Array.isArray(specialty)
          ? specialty
          : typeof specialty === 'string'
          ? specialty.split(',').map((s) => s.trim()).filter(Boolean)
          : ["General Legal Practice"];
      }

      let { data: updatedLawyer, error } = await supabaseAdmin
        .from('lawyers')
        .update(updatePayload)
        .in('profile_id', targetIds)
        .select('*, profile:profiles(*)')
        .maybeSingle();

      if (!updatedLawyer) {
        const insertPayload = {
          id: dbUserId,
          profile_id: dbUserId,
          profile_photo_url: profile_photo_url || null,
          bar_council_number: bar_council_number || "BAR/VERIFIED/2026",
          specialty: Array.isArray(specialty) ? specialty : ["General Legal Practice"],
          years_experience: parseInt(years_experience, 10) || 5,
          bio: bio || "Verified Advocate on Mera Wakeel AI Platform",
          consultation_fee_range: consultation_fee_range || "₹1,000 / consultation",
          rating_avg: 5.0,
          total_cases_handled: 12,
          is_verified: false,
          available: true,
          updated_at: new Date().toISOString()
        };
        const { data: createdData } = await supabaseAdmin
          .from('lawyers')
          .upsert(insertPayload, { onConflict: 'id' })
          .select('*, profile:profiles(*)')
          .maybeSingle();
        updatedLawyer = createdData;
      }

      return res.json({ success: true, lawyer: updatedLawyer });
    } catch (err: any) {
      console.error("/api/db/lawyers/update error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/db/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId || !supabaseAdmin) return res.json({ success: false, profile: null });

      const authReq = req as AuthedRequest;
      if (isUuid(userId) && authReq.supabaseUserId && userId !== authReq.supabaseUserId) {
        return res.status(403).json({ success: false, error: "Forbidden: you can only read your own profile." });
      }

      const dbUserId = toUuid(userId);
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .in('id', Array.from(new Set([userId, dbUserId].filter(isUuid))))
        .maybeSingle();

      return res.json({ success: true, profile: data });
    } catch (err: any) {
      return res.json({ success: false, profile: null });
    }
  });

  app.post("/api/db/profile/save", requireAuth, async (req, res) => {
    try {
      const profileId = req.body.id || req.body.userId || req.body.user_id;
      if (!profileId) return res.status(400).json({ error: "id or userId required" });

      // Ownership guard: a user may only save their own profile.
      const authReq = req as AuthedRequest;
      if (authReq.supabaseUserId && isUuid(profileId) && profileId !== authReq.supabaseUserId) {
        return res.status(403).json({ success: false, error: "Forbidden: you can only save your own profile." });
      }

      const fullName = req.body.full_name || req.body.name || req.body.fullName || null;
      const phone = req.body.phone || null;
      const userType = req.body.user_type || req.body.userType || req.body.role || 'citizen';
      const preferredLanguage = req.body.preferred_language || req.body.preferredLanguage || 'hindi';
      const city = req.body.city || null;
      const state = req.body.state || null;

      const dbUserId = toUuid(profileId);
      const profObj = {
        id: dbUserId,
        full_name: fullName,
        phone,
        user_type: userType,
        preferred_language: preferredLanguage,
        city,
        state,
        updated_at: new Date().toISOString(),
      };

      if (supabaseAdmin) {
        const { data } = await supabaseAdmin.from('profiles').upsert(profObj, { onConflict: 'id' }).select('*').single();
        if (data) return res.json({ success: true, profile: data });
      }

      return res.json({ success: true, profile: profObj });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/db/reviews", async (req, res) => {
    try {
      const lawyer_id = req.query.lawyer_id || req.query.lawyerId;
      if (!lawyer_id) return res.status(400).json({ error: "lawyer_id is required" });

      if (supabaseAdmin) {
        const targetId = String(lawyer_id);
        const dbLawyerId = toUuid(targetId);
        const { data, error } = await supabaseAdmin
          .from('reviews')
          .select('*')
          .in('lawyer_id', Array.from(new Set([targetId, dbLawyerId].filter(isUuid))))
          .order('created_at', { ascending: false });

        if (!error && data) {
          return res.json({ success: true, reviews: data });
        }
      }
      return res.json({ success: true, reviews: [] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/db/reviews/save", requireAuth, async (req, res) => {
    try {
      const { lawyer_id, lawyerId, citizen_id, citizenId, rating, review_text, reviewText } = req.body;
      const targetLawyerId = lawyer_id || lawyerId;
      const targetCitizenId = citizen_id || citizenId;
      const text = review_text || reviewText || '';
      const numRating = Number(rating) || 5;

      if (!targetLawyerId) return res.status(400).json({ error: "lawyer_id is required" });

      // Ownership guard: a citizen may only submit a review as themselves.
      const authReq = req as AuthedRequest;
      if (authReq.supabaseUserId && isUuid(targetCitizenId) && targetCitizenId !== authReq.supabaseUserId) {
        return res.status(403).json({ success: false, error: "Forbidden: you can only submit reviews as yourself." });
      }

      const dbCitizenId = await serverEnsureProfile(targetCitizenId);
      const dbLawyerId = isUuid(String(targetLawyerId)) ? String(targetLawyerId) : toUuid(String(targetLawyerId));
      const reviewId = crypto.randomUUID();

      const revObj = {
        id: reviewId,
        lawyer_id: dbLawyerId,
        citizen_id: dbCitizenId,
        rating: numRating,
        review_text: text,
        created_at: new Date().toISOString(),
      };

      if (supabaseAdmin) {
        const { data, error } = await supabaseAdmin
          .from('reviews')
          .upsert(revObj, { onConflict: 'id' })
          .select('*')
          .single();

        if (error) {
          console.warn('/api/db/reviews/save insert error:', error.message);
        }

        const { data: revs } = await supabaseAdmin.from('reviews').select('rating').eq('lawyer_id', dbLawyerId);
        if (revs && revs.length > 0) {
          const avg = revs.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / revs.length;
          const formattedAvg = parseFloat(avg.toFixed(1));
          await supabaseAdmin.from('lawyers').update({ rating_avg: formattedAvg }).eq('id', dbLawyerId);
        }

        if (data) return res.json({ success: true, review: data });
      }

      return res.json({ success: true, review: revObj });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/db/stats/trust", async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.json({ success: true, stats: { total_consultations: 0, resolved_cases: 0, verified_lawyers: 0, avg_rating: 0, total_lawyers: 0 } });
      }
      const [{ count: consultations }, { count: resolved }, { data: lawyers }, { data: reviews }] = await Promise.all([
        supabaseAdmin.from("cases").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("cases").select("id", { count: "exact", head: true }).eq("status", "resolved").or("status.eq.closed,status.eq.resolved"),
        supabaseAdmin.from("lawyers").select("id, is_verified, verification_status"),
        supabaseAdmin.from("reviews").select("rating"),
      ]);

      const verifiedLawyers = (lawyers || []).filter((l: any) => l.is_verified === true || l.verification_status === "verified").length;
      const totalLawyers = (lawyers || []).length;
      const avgRating = reviews && reviews.length
        ? parseFloat((reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1))
        : 0;

      const stats = {
        total_consultations: consultations || 0,
        resolved_cases: (resolved as any)?.[0]?.count ?? 0,
        verified_lawyers: verifiedLawyers,
        total_lawyers: totalLawyers,
        avg_rating: avgRating,
      };
      return res.json({ success: true, stats });
    } catch (err: any) {
      console.error("/api/db/stats/trust error:", err);
      return res.json({ success: true, stats: { total_consultations: 0, resolved_cases: 0, verified_lawyers: 0, avg_rating: 0, total_lawyers: 0 } });
    }
  });

  app.get("/api/db/deadlines", async (req, res) => {
    try {
      const citizenId = String((req.query.citizenId as string) || req.query.citizen_id || "").trim() || undefined;
      const caseId = req.query.caseId as string | undefined;
      if (!citizenId && !caseId) return res.json({ success: true, deadlines: [] });
      if (!supabaseAdmin) return res.json({ success: true, deadlines: [] });

      if (caseId) {
        if (!(await assertCaseAccess(req, res, caseId))) return;
      } else if (citizenId) {
        if (!assertCitizenScope(req, res, citizenId)) return;
      }

      let query = supabaseAdmin.from("case_deadlines").select("*, case:cases(id,title,status)");
      if (caseId) {
        const ids = Array.from(new Set([caseId, toUuid(caseId)].filter(isUuid)));
        query = query.in("case_id", ids);
      }
      if (citizenId && !caseId) {
        const ids = Array.from(new Set([citizenId, toUuid(citizenId)].filter(isUuid)));
        query = query.in("citizen_id", ids);
      }
      const { data, error } = await query.order("due_date", { ascending: true });
      if (error) throw error;
      return res.json({ success: true, deadlines: data || [] });
    } catch (err: any) {
      console.warn("/api/db/deadlines GET error:", err.message);
      return res.json({ success: true, deadlines: [] });
    }
  });

  app.post("/api/db/deadlines/save", optionalAuth, async (req, res) => {
    try {
      const { case_id, caseId, citizen_id, citizenId = "guest_citizen", deadline_type, due_date, notes } = req.body;
      const targetCaseId = case_id || caseId;
      const targetCitizenId = citizen_id || citizenId;
      if (!targetCaseId || !deadline_type || !due_date) {
        return res.status(400).json({ error: "case_id, deadline_type, and due_date are required" });
      }
      const validTypes = ["hearing", "filing", "response"];
      if (!validTypes.includes(deadline_type)) {
        return res.status(400).json({ error: `deadline_type must be one of ${validTypes.join(", ")}` });
      }

      if (!(await assertCaseAccess(req, res, targetCaseId))) return;

      const dbCaseId = await serverEnsureCase(targetCaseId, targetCitizenId);
      const dbCitizenId = await serverEnsureProfile(targetCitizenId);

      const dlObj = {
        id: crypto.randomUUID(),
        case_id: dbCaseId,
        citizen_id: dbCitizenId,
        deadline_type: deadline_type,
        due_date: new Date(due_date).toISOString(),
        notes: notes || null,
        reminder_sent: false,
        created_at: new Date().toISOString(),
      };

      if (supabaseAdmin) {
        const { data, error } = await supabaseAdmin.from("case_deadlines").insert(dlObj).select("*").single();
        if (error) {
          console.warn("/api/db/deadlines/save insert error:", error.message);
          return res.status(500).json({ success: false, error: error.message });
        }
        if (data) return res.json({ success: true, deadline: data });
      }
      return res.json({ success: true, deadline: dlObj });
    } catch (err: any) {
      console.error("/api/db/deadlines/save error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/db/deadlines/:id", optionalAuth, async (req, res) => {
    try {
      const id = req.params.id;
      if (!isUuid(id)) return res.status(400).json({ error: "Invalid deadline id" });
      if (supabaseAdmin) {
        const { data: dlRow } = await supabaseAdmin.from("case_deadlines").select("case_id").eq("id", id).maybeSingle();
        if (!dlRow) return res.status(404).json({ error: "Deadline not found" });
        if (!(await assertCaseAccess(req, res, dlRow.case_id))) return;
        const { error } = await supabaseAdmin.from("case_deadlines").delete().eq("id", id);
        if (error) throw error;
      }
      return res.json({ success: true });
    } catch (err: any) {
      console.error("/api/db/deadlines DELETE error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // POST create support ticket
  app.post("/api/db/support-tickets", requireAuth, async (req, res) => {
    try {
      const citizenId = (req as AuthedRequest).supabaseUserId;
      if (!citizenId) return res.status(401).json({ success: false, error: "Not authenticated" });
      if (!supabaseAdmin) return res.status(503).json({ success: false, error: "Database not configured" });
      const { subject, message, citizen_email } = req.body;
      if (!subject?.trim() || !message?.trim()) {
        return res.status(400).json({ success: false, error: "Subject and message are required" });
      }
      const { data, error } = await supabaseAdmin
        .from("support_tickets")
        .insert({
          citizen_id: citizenId,
          citizen_email: citizen_email || null,
          subject: subject.trim(),
          message: message.trim(),
        })
        .select()
        .single();
      if (error) throw error;
      return res.json({ success: true, ticket: data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET citizen's own support tickets
  app.get("/api/db/support-tickets", requireAuth, async (req, res) => {
    try {
      const citizenId = (req as AuthedRequest).supabaseUserId;
      if (!citizenId) return res.status(401).json({ success: false, error: "Not authenticated" });
      if (!supabaseAdmin) return res.status(503).json({ success: false, error: "Database not configured" });
      const { data, error } = await supabaseAdmin
        .from("support_tickets")
        .select("id, token, citizen_email, subject, message, status, admin_reply, created_at, updated_at")
        .eq("citizen_id", citizenId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return res.json({ success: true, tickets: data || [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET track support ticket by token (public, no auth required)
  app.get("/api/support/track/:token", async (req, res) => {
    try {
      if (!supabaseAdmin) return res.status(503).json({ error: "Database not configured" });
      const token = (req.params.token || "").trim().toUpperCase();
      if (!token) return res.status(400).json({ error: "Token is required" });
      const { data, error } = await supabaseAdmin
        .from("support_tickets")
        .select("id, token, subject, message, status, admin_reply, created_at, updated_at")
        .eq("token", token)
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Ticket not found" });
      return res.json({ success: true, ticket: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });
}