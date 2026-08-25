import express from "express";
import { detectLanguageWithStats } from "../lib/language";

export const GUEST_PROFILE_ID = "cfabc5e6-1924-451e-8cc7-afc493f4e239";
export const DEFAULT_CITIZEN_ID = "a092814b-0e43-4001-9f83-138e22a52df1";

export interface ServerContext {
  supabaseAdmin: any;
  geminiApiKey: string | undefined;
  GUEST_PROFILE_ID: string;
  DEFAULT_CITIZEN_ID: string;
  adminUsesServiceRole: boolean;
  escapeXml(value: string): string;
  requestLogger(source: string, message: string): void;
  trackAnalyticsEvent(eventName: string, payload?: any, userId?: string | null): Promise<boolean>;
  detectedLangForLog(req: express.Request): string;
  geminiGenerateContent(opts: {
    model: string;
    parts: any[];
    systemInstruction?: string;
    temperature?: number;
  }): Promise<string>;
  generateVectorEmbedding(text: string): Promise<number[]>;
  isUuid(str: string): boolean;
  toUuid(id: string): string;
  serverEnsureProfile(profileId?: string): Promise<string>;
  serverEnsureCase(caseId: string, citizenId?: string): Promise<string>;
  serverResolveLawyerId(lawyerId?: string): Promise<string | null>;
}

export function createServerContext(opts: {
  supabaseAdmin: any;
  geminiApiKey: string | undefined;
  geminiBase: string;
  adminUsesServiceRole: boolean;
}): ServerContext {
  const { supabaseAdmin, geminiApiKey, geminiBase, adminUsesServiceRole } = opts;

  function isUuid(str: string): boolean {
    if (!str) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  }

  function toUuid(id: string): string {
    if (!id) return crypto.randomUUID();
    if (isUuid(id)) return id;
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

  async function serverEnsureProfile(profileId?: string): Promise<string> {
    if (!supabaseAdmin) return GUEST_PROFILE_ID;

    const targetId = (!profileId || profileId === 'guest_citizen' || profileId === 'guest' || profileId.includes('guest'))
      ? GUEST_PROFILE_ID
      : (isUuid(profileId) ? profileId : toUuid(profileId));

    try {
      const { data } = await supabaseAdmin.from('profiles').select('id').eq('id', targetId).maybeSingle();
      if (data?.id) return data.id;

      const { data: upserted, error } = await supabaseAdmin.from('profiles').upsert(
        {
          id: targetId,
          full_name: targetId === GUEST_PROFILE_ID ? 'Guest Citizen' : 'Citizen User',
          user_type: 'citizen',
          preferred_language: 'hindi',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      ).select('id').maybeSingle();

      if (!error && upserted?.id) return upserted.id;
      return targetId;
    } catch (err) {
      console.warn('serverEnsureProfile warning:', err);
      return targetId;
    }
  }

  async function serverEnsureCase(caseId: string, citizenId?: string): Promise<string> {
    if (!supabaseAdmin) return caseId;
    const validCaseId = isUuid(caseId) ? caseId : toUuid(caseId);
    const validCitizenId = await serverEnsureProfile(citizenId);

    try {
      const { data } = await supabaseAdmin.from('cases').select('id').eq('id', validCaseId).maybeSingle();
      if (data?.id) return data.id;

      const { data: newCase, error } = await supabaseAdmin.from('cases').upsert({
        id: validCaseId,
        citizen_id: validCitizenId,
        title: 'Naya Legal Query',
        category: 'other',
        status: 'ongoing',
        ai_verdict: 'needs_more_info',
        confidence_score: 0.5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' }).select('id').maybeSingle();

      if (!error && newCase?.id) return newCase.id;

      return validCaseId;
    } catch (err) {
      console.warn('serverEnsureCase warning:', err);
      return validCaseId;
    }
  }

  /**
   * Resolve the canonical lawyers row id (lawyers.id) from whatever identifier the
   * client passed in. The client may pass:
   *   - the lawyers row id itself (UUID),
   *   - the lawyer's profile id / auth user id (UUID),
   *   - a legacy seed id (e.g. 'lawyer_rajesh_sharma', non-UUID).
   * Returns null when no matching lawyer row exists (so callers can 400 "Lawyer not found").
   */
  async function serverResolveLawyerId(lawyerId?: string): Promise<string | null> {
    if (!lawyerId) return null;
    if (!supabaseAdmin) return isUuid(lawyerId) ? lawyerId : toUuid(lawyerId);

    if (isUuid(lawyerId)) {
      // 1) Treat it as a profile_id (auth user id) and resolve to the row id.
      try {
        const { data: rowId } = await supabaseAdmin.rpc('resolve_lawyer_row', { profile_id: lawyerId });
        if (rowId && isUuid(String(rowId))) {
          return String(rowId);
        }
      } catch (_e) {
        // migration 001 may not be applied yet - fall through to direct query
      }
      // 2) It may already be the row id itself.
      try {
        const { data: byId } = await supabaseAdmin.from('lawyers').select('id').eq('id', lawyerId).maybeSingle();
        if (byId?.id) return byId.id;
      } catch (_e) { /* ignore */ }
      return null;
    }

    // 3) Legacy/seed id -> deterministic UUID, then confirm the row exists.
    const deterministicId = toUuid(lawyerId);
    try {
      const { data } = await supabaseAdmin
        .from('lawyers')
        .select('id')
        .or(`id.eq.${deterministicId},profile_id.eq.${deterministicId}`)
        .maybeSingle();
      if (data?.id) return data.id;
    } catch (_e) { /* ignore */ }
    return null;
  }

  function escapeXml(value: string): string {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function requestLogger(source: string, message: string): void {
    console.log(`[${source}] ${new Date().toISOString()} ${message}`);
  }

  function detectedLangForLog(req: express.Request): string {
    try {
      const text = String(req.body?.Body || req.body?.body || "");
      return text.trim() ? detectLanguageWithStats(text).language : "unknown";
    } catch (_e) {
      return "unknown";
    }
  }

  async function trackAnalyticsEvent(eventName: string, payload: any = {}, userId: string | null = null): Promise<boolean> {
    try {
      if (!supabaseAdmin) return false;
      const { error } = await supabaseAdmin.from("analytics_events").insert({
        event_name: String(eventName),
        user_id: userId || null,
        payload: payload && typeof payload === "object" ? payload : { value: payload },
        created_at: new Date().toISOString(),
      });
      if (error) console.warn(`analytics track '${eventName}' error:`, error.message);
      return !error;
    } catch (e: any) {
      console.warn("analytics track error:", e?.message || e);
      return false;
    }
  }

  async function geminiGenerateContent(opts: {
    model: string;
    parts: any[];
    systemInstruction?: string;
    temperature?: number;
  }): Promise<string> {
    if (!geminiApiKey) throw new Error("No GEMINI_API_KEY set");
    const url = `${geminiBase}/models/${opts.model}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;
    const body: any = {
      contents: [{ role: "user", parts: opts.parts }],
    };
    if (opts.systemInstruction) {
      body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
    }
    if (opts.temperature !== undefined) {
      body.generationConfig = { temperature: opts.temperature };
    }
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      throw new Error(`Gemini ${opts.model} error ${resp.status}: ${await resp.text()}`);
    }
    const data: any = await resp.json();
    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((p: any) => p.text || "")
      .join("");
    if (!text.trim()) throw new Error(`Gemini ${opts.model} returned empty response`);
    return text;
  }

  async function generateVectorEmbedding(text: string): Promise<number[]> {
    const dim = 1536;
    if (!text || !text.trim()) return new Array(dim).fill(0);

    if (geminiApiKey) {
      try {
        const url = `${geminiBase}/models/gemini-embedding-001:embedContent?key=${encodeURIComponent(geminiApiKey)}`;
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text: text.slice(0, 2048) }] },
            outputDimensionality: dim,
          }),
        });
        if (!resp.ok) {
          throw new Error(`Gemini embed error ${resp.status}: ${await resp.text()}`);
        }
        const data: any = await resp.json();
        const vec = data?.embedding?.values;
        if (vec && Array.isArray(vec) && vec.length === dim) {
          return vec;
        }
      } catch (err: any) {
        console.warn("Gemini embedContent warning, fallback to deterministic vector:", err?.message || err);
      }
    }

    const vec = new Array(dim).fill(0);
    const clean = text.toLowerCase().trim();
    const words = clean.split(/\W+/).filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = (hash << 5) - hash + word.charCodeAt(j);
        hash |= 0;
      }
      const idx = Math.abs(hash) % dim;
      vec[idx] += 1.0 / (i + 1);
    }
    let sumSq = 0;
    for (let i = 0; i < dim; i++) sumSq += vec[i] * vec[i];
    const norm = Math.sqrt(sumSq) || 1;
    return vec.map((v) => v / norm);
  }

  return {
    supabaseAdmin,
    geminiApiKey,
    GUEST_PROFILE_ID,
    DEFAULT_CITIZEN_ID,
    adminUsesServiceRole,
    escapeXml,
    requestLogger,
    trackAnalyticsEvent,
    detectedLangForLog,
    geminiGenerateContent,
    generateVectorEmbedding,
    isUuid,
    toUuid,
    serverEnsureProfile,
    serverEnsureCase,
    serverResolveLawyerId,
  };
}
