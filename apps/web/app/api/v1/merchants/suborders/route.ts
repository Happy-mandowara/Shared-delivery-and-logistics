import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { UserRole } from "@nationx/shared";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.MERCHANT, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;

  try {
    const suborders = await withUserDb(user.id, async (client) => {
      const res = await client.query(
        `SELECT ms.id, ms.suborder_number AS "suborderNumber", ms.order_id AS "orderId",
                ms.merchant_id AS "merchantId", ms.status, ms.preparation_deadline AS "preparationDeadline",
                ms.ready_at AS "readyAt", ms.handed_over_at AS "handedOverAt", ms.subtotal,
                ms.merchant_notes AS "merchantNotes", ms.created_at AS "createdAt",
                o.order_number AS "orderNumber", o.fulfillment_mode AS "fulfillmentMode",
                o.delivery_locality AS "deliveryLocality",
                o.delivery_window_start AS "deliveryWindowStart", o.delivery_window_end AS "deliveryWindowEnd"
         FROM public.merchant_suborders ms
         JOIN public.orders o ON ms.order_id = o.id
         ORDER BY ms.created_at DESC`
      );

      // Attach items
      const results = [];
      for (const row of res.rows) {
        const items = await client.query(
          `SELECT id, product_name AS "productName", sku, quantity, unit_price AS "unitPrice", handling_tag AS "handlingTag"
           FROM public.order_items WHERE suborder_id = $1`,
          [row.id]
        );
        results.push({
          ...row,
          items: items.rows,
        });
      }

      return results;
    });

    return apiSuccess(suborders);
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch merchant suborders", 500);
  }
}

