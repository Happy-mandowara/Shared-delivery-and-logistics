import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return apiError("Email is required", "EMAIL_REQUIRED", 400);
    }

    const { rows } = await pool.query(
      `SELECT id, email, name FROM public.users WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    // Return generic success to avoid user enumeration
    if (rows.length === 0) {
      return apiSuccess({
        sent: true,
        message: "If an account with this email exists, a password reset link has been dispatched.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    console.info(`[PASSWORD RESET] Email: ${email} | Token: ${resetToken} | Valid: 15 mins`);

    return apiSuccess({
      sent: true,
      message: "If an account with this email exists, a password reset link has been dispatched.",
      ...(process.env.NODE_ENV !== "production" ? { devResetToken: resetToken } : {}),
    });
  } catch (err: any) {
    return apiError(err.message, "PASSWORD_RESET_ERROR", 500);
  }
}
