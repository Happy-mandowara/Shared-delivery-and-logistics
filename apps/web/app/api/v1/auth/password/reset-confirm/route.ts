import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return apiError("MISSING_FIELDS", "Reset token and new password are required", 400);
    }

    if (newPassword.length < 8) {
      return apiError("PASSWORD_TOO_SHORT", "Password must be at least 8 characters long", 400);
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return apiError("PASSWORD_COMPLEXITY_FAILED", "Password must contain both letters and numbers", 400);
    }

    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

    // Look up token
    const tokenRes = await pool.query(
      `SELECT id, user_id, expires_at, used_at
       FROM public.password_reset_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );

    if (tokenRes.rows.length === 0) {
      return apiError("INVALID_TOKEN", "Invalid or unrecognized password reset token", 400);
    }

    const tokenRecord = tokenRes.rows[0];

    if (tokenRecord.used_at) {
      return apiError("TOKEN_ALREADY_USED", "This password reset link has already been used. Please request a new one.", 400);
    }

    if (new Date() > new Date(tokenRecord.expires_at)) {
      return apiError("TOKEN_EXPIRED", "This password reset link has expired (valid for 15 minutes). Please request a new one.", 400);
    }

    // Mark token used
    await pool.query(
      `UPDATE public.password_reset_tokens SET used_at = NOW() WHERE id = $1`,
      [tokenRecord.id]
    );

    // Update password in auth.users
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = crypto.scryptSync(newPassword, salt, 64).toString("hex");
    const combinedHash = `${salt}:${passwordHash}`;

    await pool.query(
      `UPDATE auth.users 
       SET raw_user_meta_data = jsonb_set(
         coalesce(raw_user_meta_data, '{}'::jsonb), 
         '{password_hash}', 
         to_jsonb($1::text)
       ) 
       WHERE id = $2`,
      [combinedHash, tokenRecord.user_id]
    );

    // Record audit event
    await pool.query(
      `INSERT INTO public.delivery_events (
         type, actor_id, message, reason, metadata
       ) VALUES ($1, $2, $3, $4, $5)`,
      [
        "NOTE",
        tokenRecord.user_id,
        "User successfully reset account password via verified secure token.",
        "PASSWORD_RESET",
        JSON.stringify({ userId: tokenRecord.user_id, method: "TOKEN_VERIFICATION" }),
      ]
    );

    return apiSuccess({
      updated: true,
      message: "Your password has been successfully updated. You may now sign in.",
    });
  } catch (err: any) {
    return apiError("PASSWORD_CONFIRM_ERROR", err.message || "Failed to confirm password reset", 500);
  }
}
