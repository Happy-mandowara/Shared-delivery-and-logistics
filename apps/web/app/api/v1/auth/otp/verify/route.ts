import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { signAuthToken } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { phone, otpCode, name, role = "CUSTOMER" } = body;

    if (!phone || !otpCode) {
      return apiError("Phone number and OTP code are required", "MISSING_FIELDS", 400);
    }

    const cleanPhone = phone.replace(/[\s\-\+]/g, "").replace(/^91/, "");

    // Fetch latest valid OTP record
    const { rows } = await pool.query(
      `SELECT id, otp_hash, attempts, max_attempts, expires_at, verified_at
       FROM public.otp_verifications
       WHERE phone = $1 AND verified_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [cleanPhone]
    );

    if (rows.length === 0) {
      return apiError("No active verification code found for this number. Request a new OTP.", "NO_ACTIVE_OTP", 400);
    }

    const otpRecord = rows[0];

    // Check expiry
    if (new Date() > new Date(otpRecord.expires_at)) {
      return apiError("Verification code has expired. Please request a new one.", "OTP_EXPIRED", 400);
    }

    // Check attempts limit
    if (otpRecord.attempts >= (otpRecord.max_attempts || 5)) {
      return apiError("Too many incorrect attempts. Please request a new verification code.", "MAX_ATTEMPTS_EXCEEDED", 429);
    }

    // Verify OTP code hash
    const inputHash = crypto.createHash("sha256").update(otpCode.trim()).digest("hex");
    const isMatched = otpRecord.otp_hash === inputHash || otpRecord.otp_hash === otpCode.trim();

    if (!isMatched) {
      await pool.query(
        `UPDATE public.otp_verifications SET attempts = attempts + 1 WHERE id = $1`,
        [otpRecord.id]
      );
      return apiError("Invalid verification code. Please check and try again.", "INVALID_OTP", 400);
    }

    // Mark verified
    await pool.query(
      `UPDATE public.otp_verifications SET verified_at = NOW() WHERE id = $1`,
      [otpRecord.id]
    );

    // Look up or auto-register user by phone
    let userRes = await pool.query(
      `SELECT id, name, email, phone, role, is_active AS "isActive"
       FROM public.users
       WHERE phone = $1`,
      [cleanPhone]
    );

    let user = userRes.rows[0];

    if (!user) {
      const assignedName = name || `User ${cleanPhone.slice(-4)}`;
      const assignedEmail = `${cleanPhone}@phone.nationx.local`;
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
        [newUserId, assignedName, assignedEmail, cleanPhone, role]
      );
      user = insertUser.rows[0];
    }

    if (!user.isActive) {
      return apiError("This account is suspended. Please contact support.", "ACCOUNT_SUSPENDED", 403);
    }

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = apiSuccess({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      message: "Phone number verified successfully.",
    });

    response.cookies.set("sb-access-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    return apiError(err.message, "OTP_VERIFY_ERROR", 500);
  }
}
