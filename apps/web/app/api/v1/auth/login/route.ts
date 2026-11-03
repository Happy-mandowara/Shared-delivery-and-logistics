import { NextRequest } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { signAuthToken } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { UserRole } from "@nationx/shared";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid email or password format", 400, parsed.error.format());
    }

    const { email } = parsed.data;

    const userResult = await pool.query(
      `SELECT id, name, email, phone, role, is_active AS "isActive", created_at AS "createdAt"
       FROM public.users
       WHERE lower(email) = lower($1)`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return apiError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    const user = userResult.rows[0];
    if (!user.isActive) {
      return apiError("ACCOUNT_SUSPENDED", "User account is suspended", 403);
    }

    // Generate JWT token
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    // Check if user has associated merchant or partner profile
    let merchant = null;
    let partner = null;

    if (user.role === UserRole.MERCHANT) {
      const merchResult = await pool.query(
        `SELECT id, name, code, locality, address FROM public.merchants WHERE user_id = $1`,
        [user.id]
      );
      if (merchResult.rows.length > 0) merchant = merchResult.rows[0];
    } else if (user.role === UserRole.PARTNER) {
      const partResult = await pool.query(
        `SELECT id, vehicle_type AS "vehicleType", capacity_units AS "capacityUnits", availability, current_locality AS "currentLocality"
         FROM public.delivery_partners WHERE user_id = $1`,
        [user.id]
      );
      if (partResult.rows.length > 0) partner = partResult.rows[0];
    }

    const response = apiSuccess({
      token,
      user,
      merchant,
      partner,
    });

    // Set secure session cookie
    response.cookies.set("sb-access-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err: any) {
    return apiError("INTERNAL_SERVER_ERROR", err.message || "Failed to authenticate", 500);
  }
}

