import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { UserRole } from "@nationx/shared";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PARTNER, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;

  try {
    const assignments = await withUserDb(user.id, async (client) => {
      const res = await client.query(
        `SELECT da.id, da.batch_id AS "batchId", da.partner_id AS "partnerId", da.status,
                da.offered_at AS "offeredAt", da.responded_at AS "respondedAt",
                db.batch_code AS "batchCode", db.status AS "batchStatus", db.locality,
                db.capacity_units AS "capacityUnits", db.max_orders AS "maxOrders"
         FROM public.delivery_assignments da
         JOIN public.delivery_batches db ON da.batch_id = db.id
         JOIN public.delivery_partners dp ON da.partner_id = dp.id
         WHERE dp.user_id = $1 OR (SELECT role FROM public.users WHERE id = $1) = 'ADMIN'
         ORDER BY da.offered_at DESC`,
        [user.id]
      );

      return res.rows;
    });

    return apiSuccess(assignments);
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch partner assignments", 500);
  }
}

