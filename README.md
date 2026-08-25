# ⚖️ Mera Wakeel AI — मेरा वकील AI

> **"हर भारतीय के लिए एक निजी वकील — मुफ़्त, 24×7, अपनी भाषा में।"**
> Every Indian deserves honest, expert-level legal guidance in their own language — regardless of income, education, or location.

**Mera Wakeel AI** ("My Lawyer AI") is a bilingual (Hindi / Hinglish / English) AI legal-assistance platform built specifically for India. It is not a generic chatbot that talks about law — it is a **purpose-built legal system** that understands Indian statutes, remembers your case, tells you honestly whether your case is strong or weak, and connects you with a verified, Bar Council–registered lawyer when you actually need one.

---

## 🎯 What Problem Does It Solve?

India has ~1.4 billion people but only ~1.7 million registered lawyers — and almost all of them sit in cities. This creates a massive "legal access gap":

| Problem | Reality |
|---|---|
| **Cost** | A lawyer consultation costs **₹500–₹5,000 per visit** — unaffordable for most families. |
| **Language** | The law is written in complex English. A villager in UP or Bihar who speaks only Hindi cannot understand it. |
| **Confusion** | People don't know their rights, which court to approach, which documents they need, or **whether their case is even worth fighting**. |
| **Exploitation** | Fake "legal advisors" and touts exploit people who cannot verify anyone's credentials. |
| **Time** | Courts are overloaded; waiting for a lawyer's appointment takes days. |

### Mera Wakeel AI fixes all five problems:

1. **Free & 24×7** — Instant legal guidance at zero cost, whenever you need it.
2. **In your language** — Native Hindi, Hinglish, and English (with automatic language detection).
3. **Explains the law** — Cites real Indian sections (BNS, IPC, CrPC, etc.) grounded in a legal knowledge base.
4. **Honest Verdict** — Tells you objectively if your legal position is strong, weak, or needs more evidence — *before* you waste money on an unwinnable case.
5. **Verified lawyers** — Connects you directly to KYC-verified, Bar Council–registered lawyers through the platform — no phone-number sharing, no touts.

---

## 🔍 How Does It Work?

The AI never answers "blind". Every chat message passes through a **legal pipeline** that grounds the answer in real Indian law:

```
User types (or speaks) a question
        │
        ▼
① Language detection (Hindi / Hinglish / English)
        │
        ▼
② RAG vector search — the query is embedded and matched
   against Indian statutes (BNS, IPC, CrPC…) stored in
   a pgvector database → top law sections are retrieved
        │
        ▼
③ AI memory — everything already known about this user's
   case ([[FACT: key = value]] tags saved earlier) is injected
        │
        ▼
④ System prompt built → legal persona + language rules +
   retrieved sections + memory + user's documents
        │
        ▼
⑤ Groq LLM (openai/gpt-oss-120b) generates the answer,
   grounded in the retrieved law, with fallback models
        │
        ▼
⑥ Answer is returned — verdict, case score, and facts are
   auto-saved back to the user's case record
```

**The "Honest Verdict" principle:** If your claim is legally wrong, the AI tells you clearly and kindly — instead of flattering you like most chatbots. It also gives a **case-strength score (0–100)** and a checklist of evidence you may need, so you never enter a court unprepared.

### Core capabilities
- **💬 Legal chat** — senior-lawyer persona, grounded in Indian law, in Hindi/Hinglish/English.
- **🎙️ Voice** — speak in Hindi (Whisper transcription), hear answers in your own language (TTS), plus a full **AI phone-call mode**.
- **📄 Document analysis** — upload a KYC, FIR, sale deed, will, or rent agreement (image/PDF) and get OCR + plain-language legal analysis (Qwen vision model).
- **🗂️ My Cases** — create cases, track evidence, court deadlines with **daily SMS/WhatsApp reminders**, and the AI's saved verdicts/facts.
- **👨‍⚖️ Lawyer marketplace** — browse KYC-verified lawyers, connect, rate, and direct-message them — all in-platform.
- **📲 WhatsApp** — talk to the AI through WhatsApp itself.
- **📴 Works on slow networks** — installable PWA with a "Data Saver" mode for low-bandwidth users.

---

## ⚔️ Why Is This Better Than ChatGPT, Claude & Generic AI Tools?

ChatGPT and Claude are brilliant *general* assistants. But for Indian legal help, they fail at the exact moments that matter:

| Need | **Mera Wakeel AI** | ChatGPT / Claude | Why it matters |
|---|---|---|---|
| **Native Hindi / Hinglish** | ✅ Built-in, automatic detection | ❌ Works, but sounds translated & awkward | Rural Indians think in Hindi, not English |
| **Indian law grounding (BNS, IPC, CrPC)** | ✅ RAG over a real statutes database | ❌ Generic knowledge; may hallucinate section numbers | Wrong section number in court = disaster |
| **Honest verdict on your case** | ✅ Tells you if your case is weak | ❌ Flatters / stays neutral | Saves you money & wasted years in court |
| **Case strength score (0–100)** | ✅ Yes | ❌ No | Quick, objective reality check |
| **Document OCR + legal analysis** | ✅ Upload & analyze Indian documents | ❌ No (text/links only) | Understand your own FIR / sale deed |
| **Remembers your case across chats** | ✅ AI memory ([[FACT]] system) | ❌ No persistent case memory | No repeating yourself every message |
| **AI voice call in Hindi** | ✅ Full call mode | ❌ No | For elderly & low-literacy users |
| **Connects you to a real lawyer** | ✅ Verified marketplace in-app | ❌ Can't | Takes you from "advice" to "action" |
| **Court deadline reminders** | ✅ SMS / WhatsApp / in-app | ❌ No | Never miss a hearing date |
| **Works on 2G / low bandwidth** | ✅ PWA + Data Saver mode | ❌ App is heavy | Reaches the villages that need it most |
| **Privacy** | ✅ Guest sessions + RLS; no data sold | ⚠️ General-purpose cloud | Legal matters are sensitive |

**In one line:** ChatGPT/Claude *talk about* law; **Mera Wakeel AI actually *does* legal work** — it reads your documents, knows your case, checks your legal position against real Indian statutes, tells you the truth, reminds you of deadlines, and hands you off to a verified lawyer.

---

## ✨ Features at a Glance

- AI legal chat with senior-lawyer persona (Gemini + Groq with automatic provider fallback)
- Voice input (STT), voice output (TTS), and AI voice-call mode
- Vision-based document analysis with OCR extraction
- My Cases: evidence tracking, deadline timeline, AI verdicts & confidence scores
- RAG knowledge base over Indian statutes (pgvector embeddings)
- Lawyer marketplace with KYC verification (Bar Council number) & admin approval
- Direct messaging between citizens and lawyers
- WhatsApp integration & Twilio deadline reminders
- Admin dashboard (verify lawyers, analytics)
- Guest sessions (no sign-up needed) with isolated data
- Installable PWA with offline cache & low-bandwidth mode

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4 |
| Backend | Node.js, Express 4 (single server serving SPA + API) |
| Database | Supabase (PostgreSQL, RLS, pgvector) |
| AI (primary) | Groq — `openai/gpt-oss-120b` (chat), `openai/gpt-oss-20b` (fallback), `qwen/qwen3.6-27b` (vision/OCR), `whisper-large-v3-turbo` (transcription) |
| AI (optional) | Google Gemini (TTS & embeddings, with working fallbacks) |
| Comms | Twilio (WhatsApp + SMS reminders), Google Translate TTS fallback |
| Security | Helmet, express-rate-limit, HMAC-signed guest tokens, RLS + server-side ownership checks |

> 💡 **Only one API key is mandatory:** a Groq key (`VITE_GROQ_API_KEY`). Gemini is optional — every Gemini feature has a working fallback, so the app runs fully without it.

---

## 🚀 Quick Start (Development)

**Prerequisites:** Node.js 20+

```bash
npm install
cp .env.example .env   # then fill in your keys
npm run dev            # open http://localhost:3000
```

Minimum `.env` values: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET` (generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Add `VITE_GROQ_API_KEY` for AI features.

### Database (Supabase)
1. Create a project at https://supabase.com.
2. Run `supabase/schema.sql` (tables) and `supabase/rls_policies.sql` (RLS + storage) in the SQL Editor.
3. Copy the project URL, anon key, and **service_role** key into `.env`.
   > ⚠️ The server uses the service_role key server-side to write on behalf of users. Never expose it to the browser or commit it.

### Tests

```bash
npm test          # Vitest — 74 unit tests, all passing
npm run lint      # TypeScript typecheck (tsc --noEmit)
```

---

## ☁️ Production Deployment

```bash
npm ci
npm run build                       # Vite SPA + esbuild server bundle → dist/
NODE_ENV=production node dist/server.cjs
```

Or with Docker: `docker compose up -d --build` (healthcheck at `/api/health`, auto-restart, graceful shutdown).

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Public anon key (client, subject to RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Secret server-only key (bypasses RLS) |
| `SESSION_SECRET` | ✅ | Random 32-byte hex; signs guest-session tokens |
| `VITE_GROQ_API_KEY` | ⚠️ | AI chat/vision/voice (see note above) |
| `PORT` / `APP_URL` | ➖ | Port (default 3000) / production URL for CORS |
| `GEMINI_API_KEY`, `TWILIO_*`, `ADMIN_API_KEY` | ➖ | Optional: advanced AI / WhatsApp / admin |

---

## 📁 Project Structure

```
├── server.ts              # Express server: SPA serving + all /api routes
├── legalPersona.ts        # Senior-lawyer system prompt builder
├── src/
│   ├── routes/            # Server route modules (auth, ai, db, documents, whatsapp, admin…)
│   ├── lib/               # apiClient, supabase, groq, gemini, rag, language, citations…
│   └── components/        # React UI (chat, cases, lawyers, docs, admin…)
├── supabase/              # Schema + RLS policies (run in Supabase SQL editor)
├── tests/                 # Vitest unit tests
├── docker-compose.yml     # One-command container deployment
└── Dockerfile             # Multi-stage production image
```

---

## 📜 License

Private — for authorized team use only.
