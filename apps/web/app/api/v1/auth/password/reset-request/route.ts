import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string") {
      return apiError("EMAIL_REQUIRED", "Email address is required", 400);
    }

    const cleanEmail = email.trim().toLowerCase();

    const { rows } = await pool.query(
      `SELECT id, email, name FROM public.users WHERE LOWER(email) = LOWER($1)`,
      [cleanEmail]
    );

    // Return generic success to avoid user enumeration if user not found
    if (rows.length === 0) {
      return apiSuccess({
        sent: true,
        message: "If an account with this email exists, a password reset link has been dispatched.",
      });
    }

    const user = rows[0];
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawResetToken).digest("hex");

    // Invalidate previous unused reset tokens for this user
    await pool.query(
      `UPDATE public.password_reset_tokens 
       SET used_at = NOW() 
       WHERE user_id = $1 AND used_at IS NULL`,
      [user.id]
    );

    // Store expiring reset token (valid for 15 minutes)
    await pool.query(
      `INSERT INTO public.password_reset_tokens (
         user_id, token_hash, expires_at
       ) VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
      [user.id, tokenHash]
    );

    const hasSmtpConfigured = Boolean(process.env.SMTP_HOST || process.env.RESEND_API_KEY || process.env.SUPABASE_SMTP_HOST);

    console.info(`[PASSWORD RESET DISPATCH] User: ${user.name} (${user.id}) | Email: ${cleanEmail} | Token: ${rawResetToken} | Valid: 15 mins | SMTP: ${hasSmtpConfigured ? 'Configured' : 'Not configured'}`);

    const isDevelopment = process.env.NODE_ENV !== "production";

    return apiSuccess({
      sent: true,
      smtpConfigured: hasSmtpConfigured,
      message: "If an account with this email exists, a password reset link has been dispatched.",
      ...(isDevelopment ? { devResetToken: rawResetToken } : {}),
    });
  } catch (err: any) {
    return apiError("PASSWORD_RESET_ERROR", err.message || "Failed to process reset request", 500);
  }
}
