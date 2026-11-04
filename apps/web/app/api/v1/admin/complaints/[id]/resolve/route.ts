import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== "ADMIN") {
      return apiError("Admin privileges required", "UNAUTHORIZED", 403);
    }

    const { id } = await params;
    const body = await req.json();
    const { status = "RESOLVED", refundAmount = 0, resolutionNotes } = body;

    const updateRes = await pool.query(
      `UPDATE public.customer_complaints
       SET status = $1,
           refund_amount = $2,
           resolution_notes = $3,
           resolved_by = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, customer_id AS "customerId", order_id AS "orderId", status, refund_amount AS "refundAmount"`,
      [
        status,
        parseFloat(refundAmount) || 0,
        resolutionNotes || `Resolved with status: ${status}`,
        user.id,
        id,
      ]
    );

    if (updateRes.rows.length === 0) {
      return apiError("Complaint not found", "NOT_FOUND", 404);
    }

    const complaint = updateRes.rows[0];

    // Create notification for customer
    await pool.query(
      `INSERT INTO public.notifications (
         user_id, role, type, title, message, link, read
       )
       VALUES ($1, 'CUSTOMER', 'COMPLAINT_RESOLVED', 'Complaint Update', $2, $3, false)`,
      [
        complaint.customerId,
        `Your dispute has been ${status.toLowerCase()}.${refundAmount > 0 ? ` A refund of ₹${refundAmount} has been credited to your UPI.` : ""}`,
        `/customer/orders/${complaint.orderId}`
      ]
    );

    return apiSuccess({
      resolved: true,
      complaint,
      message: "Complaint resolution recorded and customer notified.",
    });
  } catch (err: any) {
    return apiError(err.message, "RESOLVE_COMPLAINT_ERROR", 500);
  }
}
