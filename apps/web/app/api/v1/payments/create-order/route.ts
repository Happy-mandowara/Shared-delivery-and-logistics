import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const body = await req.json();
    const { orderId, amount, paymentMethod = "UPI" } = body;

    if (!orderId || !amount) {
      return apiError("orderId and amount are required", "MISSING_FIELDS", 400);
    }

    // Verify order exists
    const orderRes = await pool.query(
      `SELECT id, customer_id, total, payment_reference
       FROM public.orders
       WHERE id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      return apiError("Order not found", "ORDER_NOT_FOUND", 404);
    }

    const order = orderRes.rows[0];

    // If Cash on Delivery
    if (paymentMethod === "COD") {
      const codRef = `COD_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      await pool.query(
        `UPDATE public.orders
         SET payment_reference = $1
         WHERE id = $2`,
        [codRef, orderId]
      );

      return apiSuccess({
        paymentMethod: "COD",
        paymentReference: codRef,
        status: "PENDING_ON_DELIVERY",
        message: "Order placed successfully with Cash On Delivery.",
      });
    }

    // Online Payment Gateway Simulation (Razorpay / UPI / PhonePe)
    const gatewayOrderId = `order_${crypto.randomBytes(8).toString("hex")}`;
    const amountInPaise = Math.round(Number(amount) * 100);

    return apiSuccess({
      gatewayOrderId,
      amount: amountInPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_nationx_khammam",
      paymentMethod,
      orderId,
      customer: {
        name: user?.name || "Customer",
        email: user?.email || "customer@nationx.local",
        phone: user?.phone || "9848022334"
      },
      message: "Gateway order initiated successfully.",
    });
  } catch (err: any) {
    return apiError(err.message, "PAYMENT_ORDER_ERROR", 500);
  }
}
