import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { CreateBatchInputSchema, UserRole } from "@nationx/shared";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;

  try {
    const batches = await withUserDb(user.id, async (client) => {
      const res = await client.query(
        `SELECT 
           b.id,
           b.batch_code,
           b.status,
           b.locality,
           b.max_orders,
           b.capacity_units,
           b.estimated_distance_km,
           b.estimated_duration_min,
           b.planned_at,
           b.dispatched_at,
           b.completed_at,
           b.created_at,
           b.updated_at,
           (
             SELECT json_build_object(
               'id', da.id,
               'partner_id', da.partner_id,
               'status', da.status,
               'offered_at', da.offered_at,
               'responded_at', da.responded_at,
               'partner_name', u.name,
               'partner_phone', u.phone,
               'vehicle_type', dp.vehicle_type
             )
             FROM public.delivery_assignments da
             JOIN public.delivery_partners dp ON da.partner_id = dp.id
             JOIN public.users u ON dp.user_id = u.id
             WHERE da.batch_id = b.id
             ORDER BY da.created_at DESC
             LIMIT 1
           ) as active_assignment,
           (
             SELECT count(*)::int FROM public.batch_orders bo WHERE bo.batch_id = b.id
           ) as suborder_count,
           (
             SELECT count(*)::int FROM public.delivery_stops ds WHERE ds.batch_id = b.id
           ) as stop_count,
           (
             SELECT count(*)::int FROM public.delivery_stops ds WHERE ds.batch_id = b.id AND ds.status = 'COMPLETED'
           ) as completed_stop_count
         FROM public.delivery_batches b
         ORDER BY b.created_at DESC`
      );
      return res.rows;
    });

    return apiSuccess({ batches });
  } catch (err: any) {
    return apiError("FETCH_BATCHES_FAILED", err.message || "Failed to fetch batches", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;

  try {
    const body = await req.json();
    const parsed = CreateBatchInputSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid batch creation payload", 400, parsed.error.format());
    }

    const { locality, maxOrders, capacityUnits, suborderIds, idempotencyKey } = parsed.data;

    const result = await withUserDb(user.id, async (client) => {
      // 1. Validate that candidate suborders exist and match locality
      const subordersCheck = await client.query(
        `SELECT ms.id, ms.status, o.delivery_locality, o.fulfillment_mode
         FROM public.merchant_suborders ms
         JOIN public.orders o ON ms.order_id = o.id
         WHERE ms.id = ANY($1)`,
        [suborderIds]
      );

      if (subordersCheck.rows.length !== suborderIds.length) {
        throw new Error("One or more selected suborders do not exist");
      }

      for (const row of subordersCheck.rows) {
        if (row.fulfillment_mode !== "SHARED_DELIVERY") {
          throw new Error(`Suborder ${row.id} does not support shared delivery mode`);
        }
      }

      // 2. Call SECURITY DEFINER fn_create_batch
      const batchRes = await client.query(
        `SELECT public.fn_create_batch($1, $2, $3, $4, $5) AS outcome`,
        [locality, maxOrders, capacityUnits, suborderIds, idempotencyKey || null]
      );

      return batchRes.rows[0].outcome;
    });

    return apiSuccess(result, 201);
  } catch (err: any) {
    if (err.code === "42501") {
      return apiError("FORBIDDEN", err.message, 403);
    }
    return apiError("BATCH_CREATION_FAILED", err.message || "Failed to create delivery batch", 400);
  }
}
