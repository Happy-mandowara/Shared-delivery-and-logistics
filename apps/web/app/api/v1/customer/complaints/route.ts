import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return apiError("Authentication required", "UNAUTHENTICATED", 401);
    }

    let query = `
      SELECT 
        c.id,
        c.customer_id AS "customerId",
        u.name AS "customerName",
        c.order_id AS "orderId",
        c.suborder_id AS "suborderId",
        c.complaint_type AS "category",
        c.description,
        c.evidence_urls AS "photoUrls",
        c.status,
        c.refund_amount AS "refundAmount",
        c.resolution_notes AS "resolutionNotes",
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt"
      FROM public.customer_complaints c
      LEFT JOIN public.users u ON u.id = c.customer_id
    `;

    const params: any[] = [];
    if (user.role !== "ADMIN") {
      query += ` WHERE c.customer_id = $1`;
      params.push(user.id);
    }

    query += ` ORDER BY c.created_at DESC`;

    const { rows } = await pool.query(query, params);
    return apiSuccess({ complaints: rows });
  } catch (err: any) {
    return apiError(err.message, "FETCH_COMPLAINTS_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return apiError("Authentication required", "UNAUTHENTICATED", 401);
    }

    const body = await req.json();
    let {
      orderId,
      suborderId,
      category = "DAMAGED_PRODUCT",
      complaintType,
      description,
      photoUrls = [],
      evidenceUrls,
    } = body;

    if (!orderId || !description) {
      return apiError("orderId and description are required", "MISSING_FIELDS", 400);
    }

    // Map category to allowed complaint_type
    const rawType = (complaintType || category || "OTHER").replace(/_ITEMS/g, "_PRODUCT");
    const allowed = [
      "DAMAGED_PRODUCT",
      "EXPIRED_PRODUCT",
      "MISSING_ITEM",
      "POOR_QUALITY",
      "INCORRECT_QUANTITY",
      "DELIVERY_DELAY",
      "MISCONDUCT",
      "PAYMENT_ISSUE",
      "OTHER"
    ];
    const finalComplaintType = allowed.includes(rawType) ? rawType : "OTHER";

    const insertRes = await pool.query(
      `INSERT INTO public.customer_complaints (
         customer_id, order_id, suborder_id, complaint_type, description, evidence_urls, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'SUBMITTED')
       RETURNING id, complaint_type AS "category", status, created_at AS "createdAt"`,
      [user.id, orderId, suborderId || null, finalComplaintType, description, evidenceUrls || photoUrls]
    );

    const complaint = insertRes.rows[0];

    return apiSuccess({
      complaint,
      message: "Complaint logged successfully. Our resolution team will review the photos and initiate a refund or replacement within 2 hours.",
    });
  } catch (err: any) {
    return apiError(err.message, "CREATE_COMPLAINT_ERROR", 500);
  }
}
