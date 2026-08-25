import express from "express";
import type { ServerContext } from "./context";
import { requireAdmin } from "./authMiddleware";

export function registerAnalyticsRoutes(app: express.Express, ctx: ServerContext): void {
  const { supabaseAdmin, trackAnalyticsEvent } = ctx;

  app.post("/api/analytics/track", async (req, res) => {
    try {
      const { event_name, user_id, payload } = req.body;
      if (!event_name) return res.status(400).json({ error: "event_name is required" });
      const ok = await trackAnalyticsEvent(String(event_name), payload || {}, user_id || null);
      return res.json({ success: ok });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/analytics/summary", requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) return res.json({ success: true, events: [], summary: [] });
      const { data, error } = await supabaseAdmin
        .from("analytics_events")
        .select("event_name, created_at")
        .order("created_at", { ascending: true })
        .limit(2000);
      if (error) throw error;

      const summary: Record<string, number> = {};
      (data || []).forEach((e: any) => {
        const day = (e.created_at || "").slice(0, 10);
        const key = `${e.event_name}|${day}`;
        summary[key] = (summary[key] || 0) + 1;
      });
      const rows = Object.entries(summary).map(([k, count]) => {
        const [event, date] = k.split("|");
        return { event, date, count };
      }).sort((a, b) => a.date.localeCompare(b.date));
      return res.json({ success: true, events: data, summary: rows });
    } catch (err: any) {
      console.error("/api/analytics/summary error:", err);
      return res.status(500).json({ error: err.message });
    }
  });
}