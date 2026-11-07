import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { pool, withUserDb } from "@/lib/db";
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
    const trackingData = await withUserDb(user.id, async (client) => {
      // 1. Fetch order details
      const orderRes = await client.query(
        `SELECT id, order_number AS "orderNumber", customer_id AS "customerId", status,
                delivery_address AS "deliveryAddress", delivery_locality AS "deliveryLocality",
                delivery_latitude AS "deliveryLatitude", delivery_longitude AS "deliveryLongitude",
                pod_code AS "podCode", created_at AS "createdAt"
         FROM public.orders
         WHERE id = $1`,
        [id]
      );

      if (orderRes.rows.length === 0) {
        return null;
      }

      const order = orderRes.rows[0];

      // Sensitive data minimization (Rule 9): Only customer who placed the order or admin can see POD
      const canViewPod = user.role === UserRole.ADMIN || user.id === order.customerId;
      if (!canViewPod) {
        delete order.podCode;
      }

      // 2. Fetch merchant pickup details
      const subordersRes = await client.query(
        `SELECT ms.id, ms.suborder_number AS "suborderNumber", ms.status,
                m.id AS "merchantId", m.name AS "merchantName", m.address AS "merchantAddress",
                m.locality AS "merchantLocality", m.latitude AS "merchantLatitude", m.longitude AS "merchantLongitude"
         FROM public.merchant_suborders ms
         JOIN public.merchants m ON ms.merchant_id = m.id
         WHERE ms.order_id = $1`,
        [id]
      );

      // 3. Fetch associated batch, stops, and assigned rider
      const batchRes = await client.query(
        `SELECT bo.batch_id AS "batchId", b.batch_code AS "batchCode", b.status AS "batchStatus",
                b.estimated_distance_km AS "estimatedDistanceKm", b.estimated_duration_min AS "estimatedDurationMin",
                da.partner_id AS "partnerId",
                dp.latitude AS "partnerLatitude", dp.longitude AS "partnerLongitude",
                dp.vehicle_type AS "vehicleType", dp.current_locality AS "partnerLocality",
                dp.updated_at AS "partnerUpdatedAt",
                u.name AS "partnerName", u.phone AS "partnerPhone"
         FROM public.batch_orders bo
         JOIN public.delivery_batches b ON bo.batch_id = b.id
         LEFT JOIN public.delivery_assignments da ON da.batch_id = b.id AND da.status IN ('ACCEPTED', 'OFFERED')
         LEFT JOIN public.delivery_partners dp ON da.partner_id = dp.id
         LEFT JOIN public.users u ON dp.user_id = u.id
         WHERE bo.order_id = $1
         LIMIT 1`,
        [id]
      );

      let batchInfo = null;
      let rider = null;
      let stops: any[] = [];

      if (batchRes.rows.length > 0) {
        const b = batchRes.rows[0];
        batchInfo = {
          id: b.batchId,
          code: b.batchCode,
          status: b.batchStatus,
          estimatedDistanceKm: b.estimatedDistanceKm,
          estimatedDurationMin: b.estimatedDurationMin,
        };

        if (b.partnerId) {
          rider = {
            id: b.partnerId,
            name: b.partnerName || "Delivery Partner",
            phone: b.partnerPhone || null,
            vehicleType: b.vehicleType || "TWO_WHEELER",
            latitude: b.partnerLatitude || null,
            longitude: b.partnerLongitude || null,
            locality: b.partnerLocality || "Khammam Corridor",
            updatedAt: b.partnerUpdatedAt || null,
          };
        }

        // Fetch stops with Rule 9 Privacy Masking
        const stopsRes = await client.query(
          `SELECT ds.id, ds.sequence, ds.type, ds.status, ds.order_id AS "orderId",
                  ds.address, ds.locality, ds.latitude, ds.longitude,
                  m.name AS "merchantName"
           FROM public.delivery_stops ds
           LEFT JOIN public.merchants m ON ds.merchant_id = m.id
           WHERE ds.batch_id = $1
           ORDER BY ds.sequence ASC`,
          [b.batchId]
        );

        stops = stopsRes.rows.map((s: any) => {
          const isPickup = s.type === "PICKUP";
          const isThisOrder = s.orderId === order.id;

          return {
            id: s.id,
            sequence: s.sequence,
            type: s.type,
            status: s.status,
            name: isPickup
              ? (s.merchantName || "Merchant Partner")
              : isThisOrder
                ? "Your Delivery Destination"
                : "Neighbourhood Stop (Privacy Protected)",
            address: isPickup
              ? (s.address || "Khammam Merchant Outlet")
              : isThisOrder
                ? s.address
                : "Khammam Delivery Corridor",
            latitude: Number(s.latitude) || 17.2472,
            longitude: Number(s.longitude) || 80.1514,
            isCurrentCustomer: isThisOrder,
          };
        });
      }

      // If no batch stops exists yet, construct from order and merchants
      if (stops.length === 0) {
        let seq = 1;
        for (const sub of subordersRes.rows) {
          stops.push({
            id: `pickup-${sub.id}`,
            sequence: seq++,
            type: "PICKUP",
            status: sub.status === "PICKED_UP" ? "COMPLETED" : "PENDING",
            name: sub.merchantName,
            address: sub.merchantAddress,
            latitude: Number(sub.merchantLatitude) || 17.2472,
            longitude: Number(sub.merchantLongitude) || 80.1514,
            isCurrentCustomer: true,
          });
        }
        stops.push({
          id: `dropoff-${order.id}`,
          sequence: seq,
          type: "DROPOFF",
          status: order.status === "DELIVERED" ? "COMPLETED" : "PENDING",
          name: "Your Delivery Destination",
          address: order.deliveryAddress,
          latitude: Number(order.deliveryLatitude) || 17.2589,
          longitude: Number(order.deliveryLongitude) || 80.1422,
          isCurrentCustomer: true,
        });
      }

      // Fallback rider location for live visualization if rider assigned but GPS not yet submitted
      if (rider && (!rider.latitude || !rider.longitude)) {
        // Default to first pending pickup stop or central corridor
        const firstStop = stops[0];
        rider.latitude = firstStop ? firstStop.latitude : 17.2472;
        rider.longitude = firstStop ? firstStop.longitude : 80.1514;
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        podCode: order.podCode || null,
        createdAt: order.createdAt,
        customerLocation: {
          address: order.deliveryAddress,
          locality: order.deliveryLocality,
          latitude: Number(order.deliveryLatitude) || 17.2589,
          longitude: Number(order.deliveryLongitude) || 80.1422,
        },
        merchants: subordersRes.rows.map((s: any) => ({
          id: s.merchantId,
          name: s.merchantName,
          status: s.status,
          address: s.merchantAddress,
          latitude: Number(s.merchantLatitude) || 17.2472,
          longitude: Number(s.merchantLongitude) || 80.1514,
        })),
        batch: batchInfo,
        rider,
        stops,
      };
    });

    if (!trackingData) {
      return apiError("NOT_FOUND", "Order tracking details not found or access restricted.", 404);
    }

    return apiSuccess(trackingData);
  } catch (err: any) {
    return apiError("TRACKING_ERROR", err.message || "Failed to retrieve real-time tracking.", 500);
  }
}
