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
    const events = await withUserDb(user.id, async (client) => {
      const res = await client.query(
        `SELECT 
           e.id,
           e.type,
           e.message,
           e.reason,
           e.actor_id,
           u.name as actor_name,
           u.role as actor_role,
           e.order_id,
           e.suborder_id,
           e.batch_id,
           b.batch_code,
           e.created_at
         FROM public.delivery_events e
         LEFT JOIN public.users u ON e.actor_id = u.id
         LEFT JOIN public.delivery_batches b ON e.batch_id = b.id
         ORDER BY e.created_at DESC
         LIMIT 100`
      );
      return res.rows;
    });

    return apiSuccess({ events });
  } catch (err: any) {
    return apiError("FETCH_EVENTS_FAILED", err.message || "Failed to fetch audit events", 500);
  }
}
