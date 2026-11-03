import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { UserRole } from "@nationx/shared";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PARTNER, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;
  const searchParams = req.nextUrl.searchParams;
  const batchId = searchParams.get("batchId");

  try {
    const stops = await withUserDb(user.id, async (client) => {
      let query = `
        SELECT ds.id, ds.batch_id AS "batchId", ds.sequence, ds.type, ds.status,
               ds.merchant_id AS "merchantId", ds.order_id AS "orderId", ds.suborder_id AS "suborderId",
               ds.address, ds.locality, ds.latitude, ds.longitude, ds.instructions,
               ds.arrived_at AS "arrivedAt", ds.completed_at AS "completedAt",
               m.name AS "merchantName", m.code AS "merchantCode",
               o.order_number AS "orderNumber"
        FROM public.delivery_stops ds
        LEFT JOIN public.merchants m ON ds.merchant_id = m.id
        LEFT JOIN public.orders o ON ds.order_id = o.id
      `;

      const params: any[] = [];
      if (batchId) {
        query += ` WHERE ds.batch_id = $1`;
        params.push(batchId);
      }

      query += ` ORDER BY ds.batch_id, ds.sequence ASC`;

      const res = await client.query(query, params);
      return res.rows;
    });

    return apiSuccess(stops);
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch delivery stops", 500);
  }
}

