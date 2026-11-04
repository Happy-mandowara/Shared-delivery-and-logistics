import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { pool } from "./db";
import { UserRole, UserDto } from "@nationx/shared";

const JWT_SECRET = process.env.JWT_SECRET || "nationx-shared-delivery-secret-key-2026";

export interface AuthSession {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Sign a session JWT for an authenticated user.
 */
export function signAuthToken(session: AuthSession): string {
  return jwt.sign(session, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Verify and decode an auth JWT.
 */
export function verifyAuthToken(token: string): AuthSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthSession;
  } catch {
    return null;
  }
}

/**
 * Extract and authenticate user from HTTP Authorization header or cookie.
 */
export async function authenticateRequest(
  req: NextRequest
): Promise<{ user: UserDto | null; error: string | null; status: number }> {
  let token: string | null = null;

  // 1. Check Authorization Bearer header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  // 2. Fallback to cookies
  if (!token) {
    token = req.cookies.get("sb-access-token")?.value || req.cookies.get("session")?.value || null;
  }

  if (!token) {
    return { user: null, error: "Missing authorization token", status: 401 };
  }

  // 3. Decode token
  let userId: string | null = null;

  // Support direct UUID bearer ONLY in explicit automated testing environments
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const allowTestUuid = process.env.NODE_ENV !== "production" && process.env.ALLOW_TEST_UUID_AUTH === "true";

  if (allowTestUuid && uuidRegex.test(token)) {
    userId = token;
  } else {
    const decoded = verifyAuthToken(token);
    if (!decoded) {
      return { user: null, error: "Invalid or expired authorization token", status: 401 };
    }
    userId = decoded.userId;
  }

  // 4. Fetch user from database
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, role, is_active AS "isActive", created_at AS "createdAt"
       FROM public.users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { user: null, error: "User not found", status: 401 };
    }

    const user: UserDto = result.rows[0];
    if (!user.isActive) {
      return { user: null, error: "User account is suspended", status: 403 };
    }

    return { user, error: null, status: 200 };
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

