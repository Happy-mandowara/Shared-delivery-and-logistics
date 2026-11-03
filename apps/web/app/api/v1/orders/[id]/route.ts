import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { UserRole } from "@nationx/shared";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, [UserRole.CUSTOMER, UserRole.ADMIN, UserRole.PARTNER]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;
  const { id } = await params;

  try {
    const orderData = await withUserDb(user.id, async (client) => {
      // 1. Fetch order (RLS automatically filters by customer_id = auth.uid() or admin)
      const orderRes = await client.query(
        `SELECT id, order_number AS "orderNumber", customer_id AS "customerId", status,
                fulfillment_mode AS "fulfillmentMode", delivery_address AS "deliveryAddress",
                delivery_locality AS "deliveryLocality", delivery_latitude AS "deliveryLatitude",
                delivery_longitude AS "deliveryLongitude", delivery_window_start AS "deliveryWindowStart",
                delivery_window_end AS "deliveryWindowEnd", dispatch_deadline AS "dispatchDeadline",
                customer_notes AS "customerNotes", payment_reference AS "paymentReference",
                subtotal, delivery_fee AS "deliveryFee", total, pod_code AS "podCode",
                pod_verified_at AS "podVerifiedAt", created_at AS "createdAt"
         FROM public.orders
         WHERE id = $1`,
        [id]
      );

      if (orderRes.rows.length === 0) {
        return null;
      }

      const order = orderRes.rows[0];

      // Sensitive data minimization: Only the order's customer and admins can view the POD code
      const canViewPod = user.role === UserRole.ADMIN || user.id === order.customerId;
      if (!canViewPod) {
        delete order.podCode;
      }

      // 2. Fetch suborders (RLS filtered)
      const subordersRes = await client.query(
        `SELECT ms.id, ms.suborder_number AS "suborderNumber", ms.order_id AS "orderId",
                ms.merchant_id AS "merchantId", m.name AS "merchantName", ms.status,
                ms.preparation_deadline AS "preparationDeadline", ms.ready_at AS "readyAt",
                ms.handed_over_at AS "handedOverAt", ms.subtotal, ms.merchant_notes AS "merchantNotes"
         FROM public.merchant_suborders ms
         JOIN public.merchants m ON ms.merchant_id = m.id
         WHERE ms.order_id = $1`,
        [id]
      );

      // 3. Fetch items for each suborder
      const suborders = [];
      for (const sub of subordersRes.rows) {
        const itemsRes = await client.query(
          `SELECT id, suborder_id AS "suborderId", product_name AS "productName",
                  sku, quantity, unit_price AS "unitPrice", handling_tag AS "handlingTag",
                  weight_units AS "weightUnits"
           FROM public.order_items
           WHERE suborder_id = $1`,
          [sub.id]
        );
        suborders.push({
          ...sub,
          items: itemsRes.rows,
        });
      }

      // 4. Fetch audit events
      const eventsRes = await client.query(
        `SELECT id, type, message, reason, actor_id AS "actorId", created_at AS "createdAt"
         FROM public.delivery_events
         WHERE order_id = $1
         ORDER BY created_at ASC`,
        [id]
      );

      return {
        ...order,
        suborders,
        events: eventsRes.rows,
      };
    });

    if (!orderData) {
      return apiError("NOT_FOUND", "Order not found or access denied", 404);
    }

    return apiSuccess(orderData);
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch order details", 500);
  }
}

