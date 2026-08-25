import { Request, Response, NextFunction } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface AuthedRequest extends Request {
  supabaseUserId?: string;
  supabaseUser?: any;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

let tokenClient: SupabaseClient | null = null;

/**
 * Verify a Supabase session token WITHOUT a JWT library: use the anon-key
 * client's `auth.getUser(token)`, which talks to Supabase's own auth server.
 */
export async function verifySupabaseSession(token: string): Promise<{ userId: string; user: any } | null> {
  if (!supabaseUrl || !anonKey || !token) return null;
  try {
    if (!tokenClient) {
      tokenClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    const { data, error } = await tokenClient.auth.getUser(token);
    if (error || !data?.user) return null;
    return { userId: data.user.id, user: data.user };
  } catch (err) {
    return null;
  }
}

function getTokenFromRequest(req: Request): string | null {
  const header = req.headers.authorization || req.headers["x-auth-token"];
  const raw = Array.isArray(header) ? header[0] : String(header || "");
  const match = raw.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1].trim() : raw.trim();
  return token || null;
}

/** Express middleware: require a valid Supabase session on a protected endpoint. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  (async () => {
    try {
      const token = getTokenFromRequest(req);
      if (!token) {
        return res.status(401).json({ success: false, error: "Login zaroori hai. Please sign in first." });
      }
      const session = await verifySupabaseSession(token);
      if (!session) {
        return res.status(403).json({ success: false, error: "Session invalid. Please login again." });
      }
      (req as AuthedRequest).supabaseUserId = session.userId;
      (req as AuthedRequest).supabaseUser = session.user;
      next();
    } catch (err) {
      return res.status(403).json({ success: false, error: "Auth verification failed." });
    }
  })();
}

/** Express middleware: optionally populate auth user if a valid token is present, but never reject. */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  (async () => {
    try {
      const token = getTokenFromRequest(req);
      if (token) {
        const session = await verifySupabaseSession(token);
        if (session) {
          (req as AuthedRequest).supabaseUserId = session.userId;
          (req as AuthedRequest).supabaseUser = session.user;
        }
      }
      next();
    } catch (err) {
      next();
    }
  })();
}

/** Express middleware: require the admin API key for admin-only endpoints. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const adminKey = process.env.ADMIN_API_KEY;
  const presented = req.headers["x-admin-key"] || req.headers["authorization"];
  const presentedKey = Array.isArray(presented) ? presented[0] : String(presented || "").replace(/^Bearer\s+/i, "");
  if (!adminKey || String(presentedKey) !== String(adminKey)) {
    res.status(403).json({ success: false, error: "Forbidden: missing or invalid admin API key" });
    return;
  }
  next();
}