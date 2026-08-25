import express from "express";
import type { ServerContext } from "./context";

export function registerAuthRoutes(app: express.Express, ctx: ServerContext): void {
  const { supabaseAdmin } = ctx;

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const {
        email,
        password,
        full_name,
        phone,
        user_type = "citizen",
        preferred_language = "hindi",
        city,
        state,
        bar_council_number,
        years_experience,
        specialty,
        bio,
        consultation_fee_range,
        court_jurisdiction,
        state_bar,
      } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email aur Password zaroori hain." });
      }

      if (!phone || !String(phone).trim() || String(phone).trim().length < 10) {
        return res.status(400).json({ error: "Valid 10-digit Mobile Number zaroori hai. Isk bina registration nahi ho sakta." });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase Service Role Key server par configured nahi hai." });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const cleanPhone = String(phone).trim();

      const { data: existingPhoneUser } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (existingPhoneUser) {
        return res.status(400).json({
          error: "Is mobile number se pehle se account registered hai. Ek mobile number se multiple account nahi ban sakte. Kripya Login karein."
        });
      }

      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: String(password),
        email_confirm: true,
        user_metadata: {
          full_name: full_name ? String(full_name).trim() : "",
          phone: phone ? String(phone).trim() : "",
          user_type,
          city,
          state,
        },
      });

      if (createError) {
        console.warn("Backend auth.admin.createUser error:", createError.message);
        if (createError.message.includes("already registered") || createError.message.includes("User already exists") || createError.message.includes("duplicate key")) {
          return res.status(400).json({ error: "Yeh email pehle se registered hai. Kripya Login karein." });
        }
        return res.status(400).json({ error: createError.message || "Registration fail ho gaya." });
      }

      const createdUser = userData?.user;
      if (!createdUser?.id) {
        return res.status(500).json({ error: "User ID generation failed." });
      }

      const userId = createdUser.id;

      const profileData = {
        id: userId,
        full_name: full_name ? String(full_name).trim() : null,
        phone: phone ? String(phone).trim() : null,
        user_type: user_type === "lawyer" ? "lawyer" : "citizen",
        preferred_language: preferred_language || "hindi",
        city: city || null,
        state: state || null,
        updated_at: new Date().toISOString(),
      };

      const { data: dbProfile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert(profileData, { onConflict: "id" })
        .select("*")
        .single();

      if (profileError) {
        console.error("Backend profiles upsert error:", profileError.message);
      }

      let lawyerRecord = null;
      if (user_type === "lawyer") {
        const parsedExp = parseInt(years_experience, 10);
        const lawyerPayload = {
          profile_id: userId,
          is_seed: false,
          specialty: Array.isArray(specialty)
            ? specialty
            : specialty
            ? [String(specialty)]
            : ["General Legal Practice"],
          years_experience: isNaN(parsedExp) ? 5 : parsedExp,
          bar_council_number: bar_council_number ? String(bar_council_number).trim() : "",
          bar_council_state: state_bar ? String(state_bar).trim() : state || "India",
          verification_status: "verified",
          verified_at: new Date().toISOString(),
          is_verified: true,
          bio: bio
            ? String(bio)
            : `Advocate enrolled with ${state_bar || "State Bar Association"}. Court Practice: ${court_jurisdiction || "District & High Courts"}. State: ${state || "India"}`,
          consultation_fee_range: consultation_fee_range
            ? String(consultation_fee_range)
            : "₹1,000 - ₹2,000 / session",
          rating_avg: 5.0,
          total_cases_handled: 0,
          available: true,
          profile_photo_url: null,
          updated_at: new Date().toISOString(),
        };

        const { data: dbLawyer, error: lawyerError } = await supabaseAdmin
          .from("lawyers")
          .upsert(lawyerPayload, { onConflict: "profile_id" })
          .select("*")
          .single();

        if (lawyerError) {
          console.error("Backend lawyers upsert error:", lawyerError.message);
        } else {
          lawyerRecord = dbLawyer;
        }
      }

      return res.json({
        success: true,
        user: {
          id: userId,
          email: cleanEmail,
        },
        profile: dbProfile || profileData,
        lawyer: lawyerRecord,
      });

    } catch (err: any) {
      console.error("Signup endpoint exception:", err);
      return res.status(500).json({ error: err.message || "Server signup failed." });
    }
  });
}