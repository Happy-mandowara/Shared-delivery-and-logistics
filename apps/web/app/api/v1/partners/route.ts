import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { UserRole } from "@nationx/shared";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;

  try {
    const partners = await withUserDb(user.id, async (client) => {
      const res = await client.query(
        `SELECT 
           dp.id,
           dp.user_id,
           u.name as full_name,
           u.phone,
           u.email,
           dp.vehicle_type,
           dp.availability as status,
           dp.capacity_units as max_capacity_units,
           dp.current_locality,
           dp.created_at,
           (
             SELECT json_build_object(
               'id', da.id,
               'batch_id', da.batch_id,
               'status', da.status,
               'offered_at', da.offered_at,
               'batch_code', db.batch_code,
               'batch_status', db.status
             )
             FROM public.delivery_assignments da
             JOIN public.delivery_batches db ON da.batch_id = db.id
             WHERE da.partner_id = dp.id AND da.status IN ('OFFERED', 'ACCEPTED')
             ORDER BY da.created_at DESC
             LIMIT 1
           ) as active_assignment
         FROM public.delivery_partners dp
         JOIN public.users u ON dp.user_id = u.id
         ORDER BY dp.availability = 'AVAILABLE' DESC, dp.capacity_units DESC`
      );
      return res.rows;
    });

    return apiSuccess({ partners });
  } catch (err: any) {
    return apiError("FETCH_PARTNERS_FAILED", err.message || "Failed to fetch delivery partners", 500);
  }
}
