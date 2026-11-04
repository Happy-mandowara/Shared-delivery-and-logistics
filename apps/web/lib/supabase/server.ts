import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

function getNormalizedSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawUrl || !supabaseAnonKey) {
    return null;
  }

  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  return { supabaseUrl, supabaseAnonKey };
}

/**
 * Creates an authoritative Supabase admin client using the service role / secret key.
 */
export function createSupabaseAdminClient() {
  const cfg = getNormalizedSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!cfg || !serviceRoleKey) return null;

  return createClient(cfg.supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates an authoritative Supabase server client wired to Next.js cookie store.
 */
export async function createSupabaseServerClient() {
  const cfg = getNormalizedSupabaseConfig();
  if (!cfg) return null;

  const cookieStore = await cookies();

  return createServerClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Can happen in Server Components
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Can happen in Server Components
        }
      },
    },
  });
}

/**
 * Creates an authoritative Supabase server client wired directly to an incoming NextRequest.
 */
export function createSupabaseReqServerClient(req: NextRequest) {
  const cfg = getNormalizedSupabaseConfig();
  if (!cfg) return null;

  return createServerClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}

