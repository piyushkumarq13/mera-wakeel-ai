import express from "express";
import type { ServerContext } from "./context";
import { buildLegalSystemPrompt } from "../../legalPersona";
import { detectLanguageWithStats, languageInstructions as languageInstructionsFor } from "../lib/language";
import { buildCitationContext } from "../lib/legalCitations";
import { buildGovernmentAidContextBlock } from "../lib/govSchemes";
import { rankLawyersForCase, inferMatchCategory } from "../lib/db/lawyerMatch";

export function registerAiRoutes(app: express.Express, ctx: ServerContext): void {
  const { supabaseAdmin, geminiApiKey, geminiGenerateContent } = ctx;

  async function buildLawyerRecommendationBlock(caseText: string, category: string, excludedLawyerIds: string[] = []): Promise<string> {
    try {
      if (!supabaseAdmin) return '';
      const { data: lawyers } = await supabaseAdmin
        .from('lawyers')
        .select('*, profile:profiles(*)')
        .order('rating_avg', { ascending: false })
        .limit(30);
      const rows = (lawyers || []) as any[];
      if (!rows.length) return '';

      const suggestions = rankLawyersForCase(rows as any, {
        category,
        text: caseText,
        excludedLawyerIds,
      });
      const top = suggestions.slice(0, 5);
      const lines = top.map((s, i) => {
        const l = s.lawyer as any;
        const name = l.profile?.full_name || 'Advocate';
        const fee = l.consultation_fee_range || '₹1,000 - ₹2,000 / session';
        const city = l.profile?.city || '—';
        const exp = l.years_experience ? `${l.years_experience} yrs` : 'Experienced';
        const rating = l.rating_avg ? `★${Number(l.rating_avg).toFixed(1)}` : '';
        return `${i + 1}. Adv. ${name} (${(l.specialty || ['General']).join(', ')} | ${exp} | ${rating} | City: ${city} | Fee: ${fee})`;
      });

      return (
        'AVAILABLE VERIFIED ADVOCATES ON MERA WAKEEL AI (ranked best for THIS specific case, best match first):\n' +
        lines.join('\n') +
        '\n\nRULE: When recommending a lawyer, ONLY recommend advocates from this exact list by their full name, in this ranked order, never repeating an advocate already handling this case. If the user asks for more options, recommend the next advocates from the list. Do not invent advocates outside this list.'
      );
    } catch (err: any) {
      console.warn('[MERA-FIX] lawyer recommendation block error:', err?.message || err);
      return '';
    }
  }

  app.post("/api/groq/transcribe", async (req, res) => {
    const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

    if (!groqKey) {
      return res.status(500).json({ error: "Groq API key not configured on server" });
    }

    try {
      const { audioBase64, mimeType = "audio/webm", language = "hi" } = req.body;

      if (!audioBase64) {
        return res.status(400).json({ error: "Missing audioBase64 data" });
      }

      const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, "");
      const audioBuffer = Buffer.from(cleanBase64, "base64");

      if (audioBuffer.length === 0) {
        return res.status(400).json({ error: "Audio data is empty" });
      }

      const audioBlob = new Blob([audioBuffer], { type: mimeType });
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", "whisper-large-v3-turbo");

      if (language === "hi" || language === "hinglish") {
        formData.append("language", "hi");
        formData.append("prompt", "Mera Wakeel AI legal consultation Hindi Hinglish text.");
      } else if (language === "en") {
        formData.append("language", "en");
      }

      let response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const formDataV3 = new FormData();
        formDataV3.append("file", audioBlob, "audio.webm");
        formDataV3.append("model", "whisper-large-v3");
        if (language === "hi" || language === "hinglish") {
          formDataV3.append("language", "hi");
        } else if (language === "en") {
          formDataV3.append("language", "en");
        }

        response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
          },
          body: formDataV3,
        });
      }

      if (!response.ok) {
        const errText = await response.text();
        console.warn("Groq transcribe failed:", response.status, errText);
        return res.status(response.status).json({ error: errText });
      }

      const data = await response.json();
      return res.json({ text: data.text || "" });
    } catch (err: any) {
      console.error("Groq transcribe endpoint error:", err);
      return res.status(500).json({ error: err.message || "Failed to transcribe audio" });
    }
  });

  app.post("/api/rag/embed", async (req, res) => {
    try {
      const { text = "" } = req.body;
      const vec = await ctx.generateVectorEmbedding(text);
      return res.json({ embedding: vec, dimension: vec.length });
    } catch (err: any) {
      console.error("RAG embed error:", err);
      return res.status(500).json({ error: err.message || "Failed to generate embedding" });
    }
  });

  app.post("/api/rag/insert", async (req, res) => {
    try {
      const { act_name, section_number, category = "other", content } = req.body;
      if (!act_name || !content) {
        return res.status(400).json({ error: "act_name and content are required" });
      }

      const textToEmbed = `${act_name} ${section_number || ""} ${content}`;
      const embedding = await ctx.generateVectorEmbedding(textToEmbed);

      let record: any = {
        id: crypto.randomUUID(),
        act_name: String(act_name).trim(),
        section_number: section_number ? String(section_number).trim() : null,
        category: category || "other",
        content: String(content).trim(),
        embedding,
      };

      if (supabaseAdmin) {
        const { data, error } = await supabaseAdmin
          .from("legal_knowledge_base")
          .insert(record)
          .select("*")
          .single();

        if (!error && data) {
          record = data;
        } else if (error) {
          console.warn("Supabase admin insert legal_knowledge_base error:", error.message);
        }
      }

      return res.json({ success: true, chunk: record });
    } catch (err: any) {
      console.error("RAG insert error:", err);
      return res.status(500).json({ error: err.message || "Failed to insert knowledge chunk" });
    }
  });

  app.post("/api/groq", async (req, res) => {
    const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

    if (!groqKey) {
      return res.status(500).json({ error: "Groq API key not configured on server" });
    }

    try {
      const { messages, model = "openai/gpt-oss-120b", temperature = 0.5 } = req.body;

      let response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
        }),
      });

      if (!response.ok && model === "openai/gpt-oss-120b") {
        response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages,
            temperature,
          }),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText });
      }

      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      console.error("Groq proxy error:", err);
      return res.status(500).json({ error: err.message || "Failed to process request" });
    }
  });

  async function handleChatRequest(req: express.Request, res: express.Response) {
    try {
      const { prompt = "", history = [], language = "hi", file, isCallMode = false, factsBlock = "", ragContext = "" } = req.body;

      let detectedLanguage = language;
      try {
        const detection = detectLanguageWithStats(prompt || "");
        if (prompt && prompt.trim()) {
          const conf = detection.confidence || 0;
          detectedLanguage = conf >= 0.5 ? detection.language : language;
        }
      } catch (_e) { /* keep client language on detection failure */ }

      const languageInstructions = languageInstructionsFor(detectedLanguage);

      let citationContext = "";
      try {
        citationContext = buildCitationContext(prompt || "", 6);
      } catch (_e) { /* ignore citation errors */ }

      let govAidContext = "";
      try {
        govAidContext = buildGovernmentAidContextBlock(prompt || "");
      } catch (_e) { /* ignore */ }

      let systemPrompt = buildLegalSystemPrompt(languageInstructions, isCallMode);

      if (citationContext && citationContext.trim()) {
        systemPrompt += `\n\n${citationContext.trim()}`;
      }

      if (govAidContext && govAidContext.trim()) {
        systemPrompt += `\n\n${govAidContext.trim()}`;
      }

      if (factsBlock && factsBlock.trim()) {
        systemPrompt += `\n\n${factsBlock.trim()}\n\nCRITICAL CONTEXT RULE: Never re-ask for any fact that already appears in the fact block above.`;
      }

      if (ragContext && typeof ragContext === "string" && ragContext.trim()) {
        systemPrompt += `\n\n${ragContext.trim()}`;
      }

      // Feed the AI real, per-case-ranked advocates so it recommends actual
      // lawyers best suited to THIS matter instead of generic advice.
      try {
        const lastAssistant = Array.isArray(history)
          ? [...history].reverse().find((h: any) => h.role === "assistant")?.content || ""
          : "";
        const caseText = `${prompt || ""} ${lastAssistant || ""}`.trim();
        const caseCategory = String(req.body?.caseCategory || req.body?.category || "") || inferMatchCategory(caseText);
        const excludedLawyerIds = Array.isArray(req.body?.excludedLawyerIds) ? req.body.excludedLawyerIds : [];
        const lawyerBlock = await buildLawyerRecommendationBlock(caseText, caseCategory, excludedLawyerIds);
        if (lawyerBlock) systemPrompt += `\n\n${lawyerBlock}`;
      } catch (_e) {
        // keep system prompt as-is on any lawyer-lookup failure
      }

      if (file && file.data) {
        let mimeType = file.mimeType || "image/jpeg";
        if (!mimeType.includes("/")) mimeType = `image/${mimeType}`;
        let cleanData = String(file.data);
        if (cleanData.includes(";base64,")) {
          cleanData = cleanData.split(";base64,")[1];
        }

        const documentSystemPrompt = "You are an expert Indian Legal Document Verifier and high-speed OCR extractor for Mera Wakeel AI. Analyze the image accurately and respond with exact structured fields.";

        if (geminiApiKey) {
          try {
            console.log("Analyzing document with Gemini 3.6 Flash Vision API...");
            const replyText = await geminiGenerateContent({
              model: "gemini-3.6-flash",
              parts: [
                { inlineData: { mimeType, data: cleanData } },
                { text: prompt || "Analyze this document and extract all legal details." },
              ],
              systemInstruction: documentSystemPrompt,
              temperature: 0.1,
            });
            if (replyText && replyText.trim()) {
              return res.json({ text: replyText.trim() });
            }
          } catch (geminiErr: any) {
            console.warn("Gemini 3.6 Flash vision error, attempting fallback:", geminiErr?.message || geminiErr);
            try {
              const replyTextFB = await geminiGenerateContent({
                model: "gemini-flash-latest",
                parts: [
                  { inlineData: { mimeType, data: cleanData } },
                  { text: prompt || "Analyze this document and extract all legal details." },
                ],
                systemInstruction: documentSystemPrompt,
                temperature: 0.1,
              });
              if (replyTextFB && replyTextFB.trim()) {
                return res.json({ text: replyTextFB.trim() });
              }
            } catch (fbErr) {
              console.warn("Gemini fallback vision error:", fbErr);
            }
          }
        }

        const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
        if (groqKey) {
          try {
            const visionMessages: any[] = [
              { role: "system", content: documentSystemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: prompt || "Ye document/image dekho aur mujhe samjhao ki ye kya hai." },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${cleanData}`,
                    },
                  },
                ],
              },
            ];

            let visionRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${groqKey}`,
              },
              body: JSON.stringify({
                model: "qwen/qwen3.6-27b",
                messages: visionMessages,
                temperature: 0.1,
                max_tokens: 1024,
              }),
            });

            if (visionRes.ok) {
              const vData = await visionRes.json();
              let replyText = vData.choices?.[0]?.message?.content || "";
              replyText = replyText.replace(/ thinking[\s\S]*?<\/think>/gi, '').trim();
              if (replyText) {
                return res.json({ text: replyText });
              }
            } else {
              const errBody = await visionRes.text();
              console.warn("Groq vision failed:", visionRes.status, errBody);
            }
          } catch (vErr: any) {
            console.warn("Groq vision exception:", vErr?.message || vErr);
          }
        }

        return res.status(503).json({
          error: "VISION_UNAVAILABLE",
          message: "Document vision analysis is temporarily unavailable. Please ensure GEMINI_API_KEY is configured in Settings > Secrets or .env file."
        });
      }

      const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
      if (groqKey) {
        const messages: any[] = [
          { role: "system", content: systemPrompt },
        ];

        if (history && Array.isArray(history)) {
          history.forEach((h: any) => {
            messages.push({
              role: h.role === "user" ? "user" : "assistant",
              content: typeof h.content === "string" ? h.content : String(h.content || ""),
            });
          });
        }

        messages.push({
          role: "user",
          content: prompt || "Kripya kanooni sahayata pradan karein.",
        });

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages,
            temperature: 0.5,
            max_tokens: 1024,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          let replyText = data.choices?.[0]?.message?.content || "Maaf kijiye, response milne me dikkat aayi.";
          replyText = replyText.replace(/ thinking[\s\S]*?<\/think>/gi, '').trim();
          return res.json({ text: replyText, detectedLanguage });
        }
      }

      let fallbackText = "नमस्ते सर/मैडम, थोड़ा समय दें। नेटवर्क में कुछ धीमापन है, मैं अभी आपकी बात फिर से देख रही हूँ।";
      if (language === "en") {
        fallbackText = "Hello Sir/Ma'am, please give me just a moment. Connection is a bit slow right now, I am looking into your matter.";
      } else if (language === "hinglish") {
        fallbackText = "Namaste Sir/Ma'am, thoda waqt dein. Connection thoda slow hai, main abhi aapki baat dobara dekh rahi hoon.";
      }
      return res.json({ text: fallbackText, detectedLanguage });

    } catch (err: any) {
      console.error("Chat Endpoint Error:", err);
      const lang = req.body?.language || "hi";
      let fallbackText = "नमस्ते सर/मैडम, थोड़ा समय दें। नेटवर्क में कुछ धीमापन है, मैं अभी आपकी बात फिर से देख रही हूँ।";
      if (lang === "en") {
        fallbackText = "Hello Sir/Ma'am, please give me just a moment. Connection is a bit slow right now, I am looking into your matter.";
      } else if (lang === "hinglish") {
        fallbackText = "Namaste Sir/Ma'am, thoda waqt dein. Connection thoda slow hai, main abhi aapki baat dobara dekh rahi hoon.";
      }
      return res.json({ text: fallbackText });
    }
  }

  const ttsCache = new Map<string, { audio: string; mimeType: string }>();

  const handleTtsRequest = async (req: express.Request, res: express.Response) => {
    try {
      const { text, language = "hi", voice = "Charon" } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required for TTS" });
      }

      const cleanText = String(text)
        .replace(/\[\[.*?\]\]/g, '')
        .replace(/Ye guidance sirf jaankari ke liye hai[^\.\n]*/gi, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[*_#`~/\\]/g, ' ')
        .replace(/^[\s\-*•\d\.\)]+/gm, '')
        .replace(/\b\d+\.\s*/g, ' ')
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) {
        return res.json({ audio: null });
      }

      const cacheKey = `${cleanText}_${language}_${voice}`;
      if (ttsCache.has(cacheKey)) {
        const cached = ttsCache.get(cacheKey)!;
        return res.json({ audio: cached.audio, mimeType: cached.mimeType, cached: true });
      }

      const isDevanagari = /[\u0900-\u097F]/.test(cleanText);
      const targetLang = (language === "hi" || isDevanagari) ? "hi" : "en";
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText.slice(0, 300))}&tl=${targetLang}&client=tw-ob`;

      const ttsRes = await fetch(ttsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (ttsRes.ok) {
        const arrayBuf = await ttsRes.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuf).toString("base64");
        const mimeType = "audio/mp3";
        if (ttsCache.size > 300) {
          const firstKey = ttsCache.keys().next().value;
          if (firstKey) ttsCache.delete(firstKey);
        }
        ttsCache.set(cacheKey, { audio: base64Audio, mimeType });
        return res.json({ audio: base64Audio, mimeType });
      }

      return res.status(500).json({ error: "TTS generation failed" });
    } catch (err: any) {
      console.error("TTS Endpoint Error:", err);
      return res.status(500).json({ error: err.message || "TTS generation failed" });
    }
  };

  app.post("/api/groq/chat", handleChatRequest);
  app.post("/api/gemini/chat", handleChatRequest);
  app.post("/api/tts", handleTtsRequest);
  app.post("/api/gemini/tts", handleTtsRequest);

  app.post("/api/judge-qa", async (req: express.Request, res: express.Response) => {
    try {
      const { question, slideContext = "General" } = req.body;
      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }

      const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
      const systemPrompt = `You are the lead full-stack developer and AI Architect of Mera Wakeel AI presenting to hackathon judges.
Answer technical questions concisely (2-4 sentences max), confidently, and accurately regarding the technical architecture, Indian legal framework integration (BNS, IPC, RAG indexing), AI hallucination prevention, data privacy, and the 2-sided legal marketplace model. Context slide: ${slideContext}`;

      if (groqKey) {
        try {
          const qaRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: "openai/gpt-oss-120b",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: question },
              ],
              temperature: 0.3,
              max_tokens: 512,
            }),
          });
          if (qaRes.ok) {
            const qaData = await qaRes.json();
            const answer = qaData.choices?.[0]?.message?.content || "";
            if (answer.trim()) {
              return res.json({ answer: answer.trim(), isFallback: false });
            }
          }
        } catch (e: any) {
          console.warn("Judge Q&A Groq error:", e?.message || e);
        }
      }

      return res.json({
        answer: "Mera Wakeel AI combines hybrid RAG vector search over Indian Statutes with Groq Llama 3.3 70b and strict legal grounding rules for reliable AI-powered legal assistance.",
        isFallback: true,
      });
    } catch (err: any) {
      console.error("Judge QA Endpoint Error:", err);
      return res.status(500).json({ error: err.message || "Failed to generate judge response" });
    }
  });
}