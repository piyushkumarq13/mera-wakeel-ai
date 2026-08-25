import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import cron from "node-cron";

import { createServerContext } from "./src/routes/context";
import { registerDbRoutes } from "./src/routes/db";
import { registerDocumentsRoutes } from "./src/routes/documents";
import { registerWhatsappRoutes } from "./src/routes/whatsapp";
import { registerAnalyticsRoutes } from "./src/routes/analytics";
import { registerAuthRoutes } from "./src/routes/auth";
import { registerAdminRoutes } from "./src/routes/admin";
import { registerAiRoutes } from "./src/routes/ai";
import { registerCaseSummaryRoutes } from "./src/routes/caseSummary";
import { registerPdfRoutes } from "./src/routes/pdf";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const adminUsesServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  && process.env.SUPABASE_SERVICE_ROLE_KEY.trim().startsWith('eyJ')
  && process.env.SUPABASE_SERVICE_ROLE_KEY !== anonKey;

if (!adminUsesServiceRole) {
  console.error('======================================================================');
  console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing or invalid in .env.');
  console.error('The server is using the ANON key for admin DB operations, which is');
  console.error('blocked by Row Level Security (RLS). Every write fails with:');
  console.error('  "new row violates row-level security policy for table ..."');
  console.error('Fix: add this to .env and restart the server:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJ...');
  console.error('Get it from: Supabase Dashboard -> Settings -> API -> service_role.');
  console.error('======================================================================');
}

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

if (geminiApiKey && !geminiApiKey.trim().startsWith('AIza') && !geminiApiKey.trim().startsWith('AQ.')) {
  console.error('WARNING: GEMINI_API_KEY does not look like a valid Gemini API key.');
  console.error('Valid keys start with "AIza" or the newer "AQ." authorization key');
  console.error('(from https://aistudio.google.com/apikey). The app still works via');
  console.error('Groq + deterministic embeddings, but Gemini features need a valid key.');
}

const ctx = createServerContext({ supabaseAdmin, geminiApiKey, geminiBase: GEMINI_BASE, adminUsesServiceRole });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      supabaseConfigured: !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
      supabaseAdminConfigured: !!supabaseAdmin,
      adminUsesServiceRole: adminUsesServiceRole,
      geminiConfigured: !!geminiApiKey,
      groqConfigured: !!(process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY),
    });
  });

  registerDbRoutes(app, ctx);
  registerDocumentsRoutes(app, ctx);
  registerWhatsappRoutes(app, ctx);
  registerAnalyticsRoutes(app, ctx);
  registerAuthRoutes(app, ctx);
  registerAdminRoutes(app, ctx);
  registerAiRoutes(app, ctx);
  registerCaseSummaryRoutes(app, ctx);
  registerPdfRoutes(app, ctx);

  // SCHEDULED JOB: Deadline reminders (item 5)
  // Runs daily at 9:00 AM IST (03:30 UTC). Finds case_deadlines within the next
  // 3 days that haven't been reminded yet and pushes an SMS via Twilio (if configured).
  const setupDeadlineReminderCron = () => {
    const cronExpr = process.env.DEADLINE_CRON || "30 3 * * *";
    if (!cron.validate(cronExpr)) {
      console.warn(`Invalid DEADLINE_CRON expression '${cronExpr}'; using default daily 9:00 IST.`);
      return;
    }
    cron.schedule(cronExpr, async () => {
      try {
        if (!supabaseAdmin) return;
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const { data: deadlines, error } = await supabaseAdmin
          .from("case_deadlines")
          .select("*, case:cases(id,title), citizen:profiles!case_deadlines_citizen_id_fkey(id, phone)")
          .gte("due_date", now.toISOString())
          .lte("due_date", threeDaysFromNow.toISOString())
          .eq("reminder_sent", false);
        if (error) {
          console.warn("Deadline reminder query error:", error.message);
          return;
        }
        for (const dl of deadlines || []) {
          const phone = dl?.citizen?.phone;
          if (!phone) continue;
          const dateStr = new Date(dl.due_date).toLocaleDateString("en-IN");
          const msg = `Mera Wakeel AI Reminder: Aapke case ki deadline (${dl.deadline_type}) ${dateStr} hai. Kripya action lein. Notes: ${dl.notes || "-"}`;
          try {
            const twilioSid = process.env.TWILIO_ACCOUNT_SID;
            const twilioToken = process.env.TWILIO_AUTH_TOKEN;
            const twilioFrom = process.env.TWILIO_FROM_NUMBER;
            if (twilioSid && twilioToken && twilioFrom) {
              const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
              const form = new URLSearchParams();
              form.set("From", twilioFrom.startsWith("+") ? twilioFrom : "+" + twilioFrom);
              form.set("To", phone.startsWith("+") ? phone : "+" + phone);
              form.set("Body", msg);
              const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
                method: "POST",
                headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
                body: form.toString(),
              });
              if (res.ok) {
                await supabaseAdmin.from("case_deadlines").update({ reminder_sent: true }).eq("id", dl.id);
                ctx.requestLogger("deadline-cron", `Reminder sent to ${phone}`);
              } else {
                ctx.requestLogger("deadline-cron", `Twilio reminder failed for ${phone}: ${res.status}`);
              }
            } else {
              ctx.requestLogger("deadline-cron", "Twilio not configured; marking reminder as sent (dry run).");
              await supabaseAdmin.from("case_deadlines").update({ reminder_sent: true }).eq("id", dl.id);
            }
          } catch (remindErr: any) {
            console.warn("Deadline reminder send error:", remindErr?.message || remindErr);
          }
        }
      } catch (cronErr: any) {
        console.error("Deadline reminder cron error:", cronErr?.message || cronErr);
      }
    });
    ctx.requestLogger("deadline-cron", `Deadline reminder job scheduled: '${cronExpr}'`);
  };
  if (supabaseAdmin) {
    setupDeadlineReminderCron();
  }

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mera Wakeel AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();