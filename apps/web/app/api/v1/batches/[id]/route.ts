import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { UserRole } from "@nationx/shared";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.PARTNER]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;
  const { id } = await params;

  try {
    const batch = await withUserDb(user.id, async (client) => {
      // 1. Fetch batch
      const batchRes = await client.query(
        `SELECT id, batch_code AS "batchCode", status, locality, max_orders AS "maxOrders",
                capacity_units AS "capacityUnits", estimated_distance_km AS "estimatedDistanceKm",
                estimated_duration_min AS "estimatedDurationMin", planned_at AS "plannedAt",
                dispatched_at AS "dispatchedAt", completed_at AS "completedAt", created_at AS "createdAt"
         FROM public.delivery_batches
         WHERE id = $1`,
        [id]
      );

      if (batchRes.rows.length === 0) return null;

      // 2. Fetch stops in order
      const stopsRes = await client.query(
        `SELECT id, sequence, type, status, merchant_id AS "merchantId", order_id AS "orderId",
                suborder_id AS "suborderId", address, locality, latitude, longitude, instructions,
                arrived_at AS "arrivedAt", completed_at AS "completedAt", failure_reason AS "failureReason"
         FROM public.delivery_stops
         WHERE batch_id = $1
         ORDER BY sequence ASC`,
        [id]
      );

      // 3. Fetch active assignment
      const assignRes = await client.query(
        `SELECT da.id, da.partner_id AS "partnerId", da.status, da.offered_at AS "offeredAt",
                dp.vehicle_type AS "vehicleType", u.name AS "partnerName", u.phone AS "partnerPhone"
         FROM public.delivery_assignments da
         JOIN public.delivery_partners dp ON da.partner_id = dp.id
         JOIN public.users u ON dp.user_id = u.id
         WHERE da.batch_id = $1
         ORDER BY da.created_at DESC LIMIT 1`,
        [id]
      );

      return {
        ...batchRes.rows[0],
        stops: stopsRes.rows,
        assignment: assignRes.rows[0] || null,
      };
    });

    if (!batch) {
      return apiError("NOT_FOUND", "Batch not found or access denied", 404);
    }

    return apiSuccess(batch);
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch batch details", 500);
  }
}

