import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { signAuthToken } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let { email, phone, otpCode, name, role = "CUSTOMER" } = body;

    if (!otpCode || typeof otpCode !== "string") {
      return apiError("MISSING_OTP", "6-digit OTP code is required", 400);
    }

    if (!email && !phone) {
      return apiError("MISSING_FIELDS", "Email address or phone number is required", 400);
    }

    let targetType: "EMAIL" | "PHONE";
    let targetIdentifier: string;

    if (email) {
      targetType = "EMAIL";
      targetIdentifier = String(email).trim().toLowerCase();
    } else {
      targetType = "PHONE";
      targetIdentifier = String(phone).replace(/[\s\-\+]/g, "").replace(/^91/, "");
    }

    // Fetch latest pending OTP record for this target
    const fetchQuery = targetType === "EMAIL"
      ? `SELECT id, otp_hash, attempts, max_attempts, expires_at, verified_at
         FROM public.otp_verifications
         WHERE email = $1 AND verified_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`
      : `SELECT id, otp_hash, attempts, max_attempts, expires_at, verified_at
         FROM public.otp_verifications
         WHERE phone = $1 AND verified_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`;

    const { rows } = await pool.query(fetchQuery, [targetIdentifier]);

    if (rows.length === 0) {
      return apiError("NO_ACTIVE_OTP", "No active verification code found. Please request a new OTP.", 400);
    }

    const otpRecord = rows[0];

    // Check expiry
    if (new Date() > new Date(otpRecord.expires_at)) {
      return apiError("OTP_EXPIRED", "Verification code has expired. Please request a new one.", 400);
    }

    // Check attempts limit
    if (otpRecord.attempts >= (otpRecord.max_attempts || 5)) {
      return apiError("MAX_ATTEMPTS_EXCEEDED", "Too many incorrect attempts. Please request a new verification code.", 429);
    }

    // Verify OTP code hash
    const inputHash = crypto.createHash("sha256").update(otpCode.trim()).digest("hex");
    const isMatched = otpRecord.otp_hash === inputHash || otpRecord.otp_hash === otpCode.trim();

    if (!isMatched) {
      await pool.query(
        `UPDATE public.otp_verifications SET attempts = attempts + 1 WHERE id = $1`,
        [otpRecord.id]
      );
      const remaining = Math.max(0, (otpRecord.max_attempts || 5) - (otpRecord.attempts + 1));
      return apiError("INVALID_OTP", `Invalid verification code. ${remaining} attempt(s) remaining.`, 400, { remainingAttempts: remaining });
    }

    // Mark verified
    await pool.query(
      `UPDATE public.otp_verifications SET verified_at = NOW() WHERE id = $1`,
      [otpRecord.id]
    );

    // Look up or auto-register user by email or phone
    const userLookupQuery = targetType === "EMAIL"
      ? `SELECT id, name, email, phone, role, is_active AS "isActive" FROM public.users WHERE lower(email) = lower($1)`
      : `SELECT id, name, email, phone, role, is_active AS "isActive" FROM public.users WHERE phone = $1`;

    let userRes = await pool.query(userLookupQuery, [targetIdentifier]);
    let user = userRes.rows[0];

    if (!user) {
      const assignedName = name || (targetType === "EMAIL" ? targetIdentifier.split("@")[0] : `User ${targetIdentifier.slice(-4)}`);
      const assignedEmail = targetType === "EMAIL" ? targetIdentifier : `${targetIdentifier}@phone.nationx.local`;
      const assignedPhone = targetType === "PHONE" ? targetIdentifier : null;
      const newUserId = crypto.randomUUID();

      // Ensure auth.users record exists first to satisfy foreign key constraint
      await pool.query(
        `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [newUserId, assignedEmail]
      );

      const insertUser = await pool.query(
        `INSERT INTO public.users (id, name, email, phone, role, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id, name, email, phone, role, is_active AS "isActive"`,
        [newUserId, assignedName, assignedEmail, assignedPhone, role]
      );
      user = insertUser.rows[0];
    }

    if (!user.isActive) {
      return apiError("ACCOUNT_SUSPENDED", "This account is suspended. Please contact support.", 403);
    }

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const redirectPath = user.role === "MERCHANT" 
      ? "/merchant" 
      : user.role === "PARTNER" 
      ? "/partner" 
      : user.role === "ADMIN" 
      ? "/admin" 
      : "/customer";

    const response = apiSuccess({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      redirectPath,
      message: `${targetType === "EMAIL" ? "Email" : "Phone number"} verified successfully.`,
    });

    response.cookies.set("sb-access-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    return apiError("OTP_VERIFY_ERROR", err.message || "Failed to verify code", 500);
  }
}
