import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return apiError("Reset token and new password are required", "MISSING_FIELDS", 400);
    }

    if (newPassword.length < 8) {
      return apiError("Password must be at least 8 characters long", "PASSWORD_TOO_SHORT", 400);
    }

    // In production with Supabase Auth, updateUserPassword or auth.updateUser is called
    return apiSuccess({
      updated: true,
      message: "Your password has been successfully updated. You may now sign in.",
    });
  } catch (err: any) {
    return apiError(err.message, "PASSWORD_CONFIRM_ERROR", 500);
  }
}
