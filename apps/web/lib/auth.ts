import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { pool } from "./db";
import { UserRole, UserDto } from "@nationx/shared";
import { createSupabaseReqServerClient } from "./supabase/server";

function getJwtSecret(): string {
  return process.env.JWT_SECRET || "nationx-shared-delivery-secret-key-2026";
}

export interface AuthSession {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Sign a session JWT for an authenticated user.
 */
export function signAuthToken(session: AuthSession): string {
  return jwt.sign(session, getJwtSecret(), { expiresIn: "7d" });
}

/**
 * Verify and decode an auth JWT.
 */
export function verifyAuthToken(token: string): AuthSession | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthSession;
  } catch {
    // Fallback in case token was signed with default secret in another process
    try {
      return jwt.verify(token, "nationx-shared-delivery-secret-key-2026") as AuthSession;
    } catch {
      return null;
    }
  }
}

/**
 * Extract and authenticate user from HTTP Authorization header or cookie.
 */
export async function authenticateRequest(
  req: NextRequest
): Promise<{ user: UserDto | null; error: string | null; status: number }> {
  let userId: string | null = null;
  let token: string | null = null;
  let authenticatedSbUser: any = null;

  // 1. Check Authorization Bearer header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  // 1a. Direct UUID Bearer in automated testing
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const allowTestUuid = process.env.NODE_ENV !== "production" && process.env.ALLOW_TEST_UUID_AUTH === "true";

  if (token && allowTestUuid && uuidRegex.test(token)) {
    userId = token;
  } else if (token) {
    // 1b. Try internal session JWT verification
    const decoded = verifyAuthToken(token);
    if (decoded) {
      userId = decoded.userId;
    } else {
      // 1c. Try Supabase Auth user verification using the Bearer token
      try {
        const sbClient = createSupabaseReqServerClient(req);
        if (sbClient) {
          const { data: { user: sbUser }, error: sbError } = await sbClient.auth.getUser(token);
          if (sbUser && !sbError) {
            userId = sbUser.id;
            authenticatedSbUser = sbUser;
          }
        }
      } catch {
        // Fall through to cookie inspection
      }
    }
  }

  // 2. If not resolved from header, inspect session cookies
  if (!userId) {
    // 2a. Check custom session cookies
    const cookieToken = req.cookies.get("sb-access-token")?.value || req.cookies.get("session")?.value || null;
    if (cookieToken) {
      const decoded = verifyAuthToken(cookieToken);
      if (decoded) {
        userId = decoded.userId;
      }
    }

    // 2b. Check Supabase SSR session cookies via authoritative createSupabaseReqServerClient
    // ONLY check if Supabase session cookies actually exist in the request
    if (!userId) {
      const allCookies = req.cookies.getAll();
      const hasSbAuthCookie = allCookies.some(
        (c) => (c.name.startsWith("sb-") && c.name.includes("auth-token")) || c.name === "supabase-auth-token"
      );
      if (hasSbAuthCookie) {
        try {
          const sbClient = createSupabaseReqServerClient(req);
          if (sbClient) {
            const { data: { user: sbUser }, error: sbError } = await sbClient.auth.getUser();
            if (sbUser && !sbError) {
              userId = sbUser.id;
              authenticatedSbUser = sbUser;
            }
          }
        } catch {
          // Fall through
        }
      }
    }
  }

  if (!userId) {
    return { user: null, error: "Missing authorization token", status: 401 };
  }

  // 3. Fetch authoritative user profile from database
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, role, is_active AS "isActive", created_at AS "createdAt"
       FROM public.users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length > 0) {
      const user: UserDto = result.rows[0];
      if (!user.isActive) {
        return { user: null, error: "User account is suspended", status: 403 };
      }
      return { user, error: null, status: 200 };
    }

    // 4. If user exists in auth.users but is midway through onboarding into public.users
    const authRes = await pool.query(
      `SELECT id, email, raw_user_meta_data FROM auth.users WHERE id = $1`,
      [userId]
    );

    if (authRes.rows.length > 0) {
      const row = authRes.rows[0];
      const meta = row.raw_user_meta_data || {};
      const provisionalUser: UserDto = {
        id: row.id,
        name: meta.full_name || meta.name || row.email?.split("@")[0] || "User",
        email: row.email,
        phone: meta.phone || null,
        role: (meta.role as UserRole) || UserRole.CUSTOMER,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      return { user: provisionalUser, error: null, status: 200 };
    }

    // 5. If user was authenticated via Supabase Cloud Auth API but is not yet in local DB
    if (authenticatedSbUser) {
      const meta = authenticatedSbUser.user_metadata || {};
      const name = meta.full_name || meta.name || authenticatedSbUser.email?.split("@")[0] || "User";
      const email = authenticatedSbUser.email || "";
      const role = (meta.role as UserRole) || UserRole.CUSTOMER;

      // Sync into auth.users and public.users
      try {
        await pool.query(
          `INSERT INTO auth.users (id, email, raw_user_meta_data)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, raw_user_meta_data = EXCLUDED.raw_user_meta_data`,
          [authenticatedSbUser.id, email, JSON.stringify(meta)]
        );
      } catch {}

      try {
        const insRes = await pool.query(
          `INSERT INTO public.users (id, name, email, role, is_active)
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
           RETURNING id, name, email, phone, role, is_active AS "isActive", created_at AS "createdAt"`,
          [authenticatedSbUser.id, name, email, role]
        );
        if (insRes.rows.length > 0) {
          return { user: insRes.rows[0], error: null, status: 200 };
        }
      } catch {}

      const provisionalUser: UserDto = {
        id: authenticatedSbUser.id,
        name,
        email,
        phone: meta.phone || null,
        role,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      return { user: provisionalUser, error: null, status: 200 };
    }

    return { user: null, error: "User not found", status: 401 };
  } catch (err: any) {
    return { user: null, error: err.message || "Authentication error", status: 500 };
  }
}

/**
 * Guard endpoint for specific roles.
 */
export async function requireAuth(
  req: NextRequest,
  allowedRoles?: UserRole[]
): Promise<{ user: UserDto; errorResponse?: null } | { user: null; errorResponse: Response }> {
  const { user, error, status } = await authenticateRequest(req);

  if (!user || error) {
    return {
      user: null,
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: { code: "UNAUTHORIZED", message: error || "Authentication required" },
        }),
        { status: status || 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return {
      user: null,
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: `Action requires one of the following roles: ${allowedRoles.join(", ")}`,
          },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  return { user, errorResponse: null };
}

/**
 * Convenient helper to retrieve the authenticated user or null.
 */
export async function getAuthUser(req: NextRequest): Promise<UserDto | null> {
  const { user } = await authenticateRequest(req);
  return user;
}

