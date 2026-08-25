import express from "express";
import type { ServerContext } from "./context";
import { requireAdmin, AuthedRequest } from "./authMiddleware";

export function registerAdminRoutes(app: express.Express, ctx: ServerContext): void {
  const { supabaseAdmin, isUuid, toUuid, trackAnalyticsEvent } = ctx;

  // Lightweight probe so the admin UI can tell the difference between "wrong
  // key" and "no admin key configured yet". Does NOT leak the key itself.
  app.get("/api/admin/status", async (_req, res) => {
    const configured = Boolean(process.env.ADMIN_API_KEY && String(process.env.ADMIN_API_KEY).trim());
    return res.json({ success: true, configured });
  });

  app.post("/api/admin/lawyers/:id/verify", requireAdmin, async (req, res) => {
    try {
      const { verification_status = "verified" } = req.body;
      const validStates = ["pending", "verified", "rejected"];
      if (!validStates.includes(verification_status)) {
        return res.status(400).json({ error: `verification_status must be one of ${validStates.join(", ")}` });
      }

      const lawyerId = req.params.id;
      const dbLawyerId = isUuid(lawyerId) ? lawyerId : toUuid(lawyerId);
      if (!isUuid(dbLawyerId)) return res.status(400).json({ error: "Invalid lawyer id" });

      if (!supabaseAdmin) return res.status(503).json({ error: "Database not configured" });

      const verified = verification_status === "verified";
      const updateData: any = {
        verification_status,
        is_verified: verified,
        verified_at: verified ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from("lawyers")
        .update(updateData)
        .eq("id", dbLawyerId)
        .select("*")
        .single();

      if (error) throw error;
      await trackAnalyticsEvent("lawyer_verified", { lawyer_id: dbLawyerId, verification_status });
      return res.json({ success: true, lawyer: data });
    } catch (err: any) {
      console.error("/api/admin/lawyers/:id/verify error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // GET all support tickets (admin only)
  app.get("/api/admin/support-tickets", requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) return res.status(503).json({ error: "Database not configured" });
      const { data, error } = await supabaseAdmin
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return res.json({ success: true, tickets: data || [] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // PATCH update ticket status (admin only)
  app.patch("/api/admin/support-tickets/:id", requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) return res.status(503).json({ error: "Database not configured" });
      const { status, admin_reply } = req.body;
      const validStatuses = ["open", "in_progress", "resolved", "closed"];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const updateData: any = { updated_at: new Date().toISOString() };
      if (status) updateData.status = status;
      if (admin_reply !== undefined) updateData.admin_reply = admin_reply;
      const { data, error } = await supabaseAdmin
        .from("support_tickets")
        .update(updateData)
        .eq("id", req.params.id)
        .select()
        .single();
      if (error) throw error;
      return res.json({ success: true, ticket: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET all users (profiles) with pagination, search, and role filter
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) return res.status(503).json({ error: "Database not configured" });

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const search = (req.query.search as string || "").trim();
      const role = (req.query.role as string || "").trim();

      let query = supabaseAdmin
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
      }
      if (role && ["citizen", "lawyer", "admin"].includes(role)) {
        query = query.eq("user_type", role);
      }

      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return res.json({
        success: true,
        users: data || [],
        total: count || 0,
        page,
        limit,
      });
    } catch (err: any) {
      console.error("/api/admin/users error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // PATCH change a user's role
  app.patch("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) return res.status(503).json({ error: "Database not configured" });

      const { user_type } = req.body;
      const validTypes = ["citizen", "lawyer", "admin"];
      if (!user_type || !validTypes.includes(user_type)) {
        return res.status(400).json({ error: `user_type must be one of ${validTypes.join(", ")}` });
      }

      const userId = req.params.id;
      if (!isUuid(userId)) return res.status(400).json({ error: "Invalid user id" });

      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update({ user_type, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select("*")
        .single();

      if (error) throw error;
      return res.json({ success: true, user: data });
    } catch (err: any) {
      console.error("/api/admin/users/:id/role error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // DELETE a user (profile + auth account)
  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) return res.status(503).json({ error: "Database not configured" });

      const userId = req.params.id;
      if (!isUuid(userId)) return res.status(400).json({ error: "Invalid user id" });

      // Check the profile exists first
      const { data: profile, error: fetchErr } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, user_type")
        .eq("id", userId)
        .single();

      if (fetchErr || !profile) {
        return res.status(404).json({ error: "User not found" });
      }

      // Delete from auth.users (this cascades to profiles via FK ON DELETE CASCADE,
      // and profiles cascades to lawyers, cases, etc.)
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authErr) {
        console.warn("auth.admin.deleteUser warning (profile may still be deleted):", authErr.message);
      }

      // Also explicitly delete the profile row in case the FK cascade didn't fire
      const { error: delErr } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (delErr) throw delErr;

      return res.json({
        success: true,
        message: `User ${profile.full_name || userId} (${profile.user_type}) deleted`,
      });
    } catch (err: any) {
      console.error("/api/admin/users/:id delete error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // GET all lawyers with admin-level filters
  app.get("/api/admin/lawyers", requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) return res.status(503).json({ error: "Database not configured" });

      const verificationStatus = (req.query.verification_status as string || "").trim();
      const search = (req.query.search as string || "").trim();

      let query = supabaseAdmin
        .from("lawyers")
        .select("*, profile:profiles(*)")
        .order("created_at", { ascending: false });

      if (verificationStatus && ["pending", "verified", "rejected"].includes(verificationStatus)) {
        query = query.eq("verification_status", verificationStatus);
      }
      if (search) {
        query = query.or(`bar_council_number.ilike.%${search}%,bar_council_state.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Also fetch profile names for lawyers via a second query if needed
      let lawyers = data || [];
      if (lawyers.length > 0 && lawyers[0]?.profile?.full_name === undefined) {
        // Profiles weren't joined, fetch them separately
        const profileIds = lawyers.map((l: any) => l.profile_id).filter(Boolean);
        if (profileIds.length > 0) {
          const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name, phone, city, state")
            .in("id", profileIds);
          const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
          lawyers = lawyers.map((l: any) => ({
            ...l,
            profile: profileMap.get(l.profile_id) || null,
          }));
        }
      }

      // If search is set, also filter by profile full_name
      if (search && lawyers.length > 0) {
        const q = search.toLowerCase();
        lawyers = lawyers.filter((l: any) => {
          const name = (l.profile?.full_name || "").toLowerCase();
          const barNum = (l.bar_council_number || "").toLowerCase();
          const barState = (l.bar_council_state || "").toLowerCase();
          return name.includes(q) || barNum.includes(q) || barState.includes(q);
        });
      }

      return res.json({ success: true, lawyers });
    } catch (err: any) {
      console.error("/api/admin/lawyers error:", err);
      return res.status(500).json({ error: err.message });
    }
  });
}