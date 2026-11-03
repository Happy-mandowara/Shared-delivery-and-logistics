import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { pool } from "@/lib/db";
import { UserRole } from "@nationx/shared";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;

  try {
    let merchant = null;
    let partner = null;

    if (user.role === UserRole.MERCHANT) {
      const merchResult = await pool.query(
        `SELECT id, name, code, locality, address, is_active AS "isActive" FROM public.merchants WHERE user_id = $1`,
        [user.id]
      );
      if (merchResult.rows.length > 0) merchant = merchResult.rows[0];
    } else if (user.role === UserRole.PARTNER) {
      const partResult = await pool.query(
        `SELECT id, vehicle_type AS "vehicleType", capacity_units AS "capacityUnits", availability, current_locality AS "currentLocality", verified
         FROM public.delivery_partners WHERE user_id = $1`,
        [user.id]
      );
      if (partResult.rows.length > 0) partner = partResult.rows[0];
    }

    return apiSuccess({
      user,
      merchant,
      partner,
    });
  } catch (err: any) {
    return apiError("INTERNAL_SERVER_ERROR", err.message || "Failed to fetch user profile", 500);
  }
}

