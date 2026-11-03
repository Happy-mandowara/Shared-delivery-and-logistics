import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { UserRole } from "@nationx/shared";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;
  const searchParams = req.nextUrl.searchParams;
  const localityFilter = searchParams.get("locality");

  try {
    const candidates = await withUserDb(user.id, async (client) => {
      let query = `
        SELECT ms.id AS "suborderId", ms.suborder_number AS "suborderNumber", ms.status,
               ms.preparation_deadline AS "preparationDeadline", ms.ready_at AS "readyAt",
               ms.subtotal, m.id AS "merchantId", m.name AS "merchantName", m.locality AS "merchantLocality",
               m.address AS "merchantAddress", o.id AS "orderId", o.order_number AS "orderNumber",
               o.delivery_locality AS "deliveryLocality", o.delivery_address AS "deliveryAddress",
               o.delivery_window_start AS "deliveryWindowStart", o.delivery_window_end AS "deliveryWindowEnd",
               o.dispatch_deadline AS "dispatchDeadline"
        FROM public.merchant_suborders ms
        JOIN public.merchants m ON ms.merchant_id = m.id
        JOIN public.orders o ON ms.order_id = o.id
        LEFT JOIN public.batch_orders bo ON ms.id = bo.suborder_id
        LEFT JOIN public.delivery_batches db ON bo.batch_id = db.id AND db.status NOT IN ('CANCELLED', 'COMPLETED')
        WHERE o.fulfillment_mode = 'SHARED_DELIVERY'
          AND ms.status IN ('PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP')
          AND db.id IS NULL
      `;

      const params: any[] = [];
      if (localityFilter) {
        query += ` AND o.delivery_locality ILIKE $1`;
        params.push(`%${localityFilter}%`);
      }

      query += ` ORDER BY o.delivery_window_end ASC NULLS LAST, ms.created_at ASC`;

      const res = await client.query(query, params);
      return res.rows;
    });

    return apiSuccess(candidates);
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch candidate suborders", 500);
  }
}

