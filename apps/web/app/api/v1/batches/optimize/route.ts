import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb, pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { UserRole } from "@nationx/shared";
import { optimizeBatches, applyOptimizedSequence, CandidateSuborder } from "@/lib/batch-optimizer";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;

  try {
    const body = await req.json().catch(() => ({}));
    const { locality = "ALL", maxOrders = 8, capacityUnits = 10, autoCreate = false } = body;

    // 1. Fetch unassigned candidate suborders with geographic coordinates
    const query = `
      SELECT 
        ms.id AS "suborderId", 
        ms.order_id AS "orderId",
        ms.suborder_number AS "suborderNumber", 
        ms.status,
        ms.preparation_deadline AS "preparationDeadline", 
        ms.ready_at AS "readyAt",
        ms.subtotal, 
        m.id AS "merchantId", 
        m.name AS "merchantName", 
        m.locality AS "merchantLocality",
        m.address AS "merchantAddress", 
        coalesce(m.latitude, 17.2472) AS "merchantLat",
        coalesce(m.longitude, 80.1514) AS "merchantLng",
        o.order_number AS "orderNumber",
        o.delivery_locality AS "deliveryLocality", 
        o.delivery_address AS "deliveryAddress",
        coalesce(o.delivery_latitude, 17.2472) AS "deliveryLat",
        coalesce(o.delivery_longitude, 80.1514) AS "deliveryLng",
        o.delivery_window_start AS "deliveryWindowStart", 
        o.delivery_window_end AS "deliveryWindowEnd",
        o.dispatch_deadline AS "dispatchDeadline",
        coalesce((SELECT sum(oi.quantity) FROM public.order_items oi WHERE oi.suborder_id = ms.id), 1) AS "itemCount",
        coalesce((SELECT sum(coalesce(oi.weight_units, 1.0) * oi.quantity) FROM public.order_items oi WHERE oi.suborder_id = ms.id), 1.0) AS "estimatedWeightUnits",
        (SELECT array_agg(DISTINCT oi.handling_tag) FROM public.order_items oi WHERE oi.suborder_id = ms.id AND oi.handling_tag IS NOT NULL) AS "handlingTags"
      FROM public.merchant_suborders ms
      JOIN public.merchants m ON ms.merchant_id = m.id
      JOIN public.orders o ON ms.order_id = o.id
      LEFT JOIN public.batch_orders bo ON ms.id = bo.suborder_id
      LEFT JOIN public.delivery_batches db ON bo.batch_id = db.id AND db.status NOT IN ('CANCELLED', 'COMPLETED')
      WHERE o.fulfillment_mode = 'SHARED_DELIVERY'
        AND ms.status IN ('PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP')
        AND db.id IS NULL
      ORDER BY (ms.status = 'READY_FOR_PICKUP') DESC, o.dispatch_deadline ASC NULLS LAST, ms.created_at ASC
    `;

    const candidatesRes = await pool.query(query);
    const candidates: CandidateSuborder[] = candidatesRes.rows;

    if (candidates.length === 0) {
      return apiSuccess({
        batches: [],
        message: "No unassigned suborders available for batching.",
        optimizedCount: 0,
      });
    }

    // 2. Run algorithmic optimization
    const optimizedBatches = optimizeBatches(candidates, {
      maxOrders: Number(maxOrders),
      maxCapacityUnits: Number(capacityUnits),
      locality: locality !== "ALL" ? locality : undefined,
    });

    // 3. If autoCreate is true, persist batches and sequence stops in database
    if (autoCreate && optimizedBatches.length > 0) {
      const createdBatches = [];

      for (const opt of optimizedBatches) {
        if (opt.suborderIds.length < 2) continue; // Only form multi-stop batches

        const result = await withUserDb(user.id, async (client) => {
          const batchRes = await client.query(
            `SELECT public.fn_create_batch($1, $2, $3, $4, NULL) AS outcome`,
            [opt.locality, maxOrders, capacityUnits, opt.suborderIds]
          );
          return batchRes.rows[0].outcome;
        });

        const batchId = result.batch_id || result.id;
        if (batchId) {
          await applyOptimizedSequence(
            batchId,
            opt.estimatedDistanceKm,
            opt.estimatedDurationMin,
            opt.stops
          );
          createdBatches.push({
            batchId,
            batchCode: result.batch_code,
            locality: opt.locality,
            suborderCount: opt.suborderIds.length,
            estimatedDistanceKm: opt.estimatedDistanceKm,
            estimatedDurationMin: opt.estimatedDurationMin,
            totalStops: opt.stops.length,
          });
        }
      }

      return apiSuccess({
        autoCreated: true,
        createdBatches,
        totalCreated: createdBatches.length,
        message: `Successfully generated and scheduled ${createdBatches.length} optimized delivery batches.`,
      }, 201);
    }

    return apiSuccess({
      optimizedBatches,
      candidateCount: candidates.length,
      suggestedBatchesCount: optimizedBatches.length,
      message: `Generated ${optimizedBatches.length} optimal batch clusters from ${candidates.length} candidates.`,
    });
  } catch (err: any) {
    return apiError("OPTIMIZATION_ERROR", err.message || "Failed to execute batch optimization", 500);
  }
}

