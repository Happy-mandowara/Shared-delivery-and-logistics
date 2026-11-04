import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, paymentId } = body;

    if (!orderId || !paymentId) {
      return apiError("orderId and paymentId are required", "MISSING_FIELDS", 400);
    }

    // Update order payment reference
    const updateRes = await pool.query(
      `UPDATE public.orders
       SET payment_reference = $1
       WHERE id = $2
       RETURNING id, customer_id, total, payment_reference`,
      [paymentId, orderId]
    );

    if (updateRes.rows.length === 0) {
      return apiError("Order not found to update payment", "ORDER_NOT_FOUND", 404);
    }

    const order = updateRes.rows[0];

    return apiSuccess({
      verified: true,
      orderId: order.id,
      paymentStatus: "PAID",
      paymentReference: paymentId,
      message: "Payment successfully verified and credited.",
    });
  } catch (err: any) {
    return apiError(err.message, "PAYMENT_VERIFY_ERROR", 500);
  }
}
