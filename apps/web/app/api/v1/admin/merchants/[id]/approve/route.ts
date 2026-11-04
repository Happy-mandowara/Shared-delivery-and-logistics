import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@nationx/shared";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, [UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;

  try {
    const updateRes = await pool.query(
      `UPDATE public.merchants
       SET is_approved = true, is_active = true, updated_at = NOW()
       WHERE id = $1
       RETURNING id, user_id AS "userId", name, code, category, locality, is_approved, is_active`,
      [id]
    );

    if (updateRes.rows.length === 0) {
      return apiError("NOT_FOUND", "Merchant not found", 404);
    }

    const merchant = updateRes.rows[0];

    // Notify merchant owner if associated with a user
    if (merchant.userId) {
      await pool.query(
        `INSERT INTO public.notifications (user_id, role, type, title, message, link, read)
         VALUES ($1, 'MERCHANT', 'MERCHANT_APPROVAL', 'Shop Approved & Live!', $2, '/merchant', false)`,
        [
          merchant.userId,
          `Congratulations! Your shop "${merchant.name}" has been verified and approved by the Khammam logistics administration. You can now accept incoming customer orders.`
        ]
      );
    }

    // Record audit event in delivery_events
    await pool.query(
      `INSERT INTO public.delivery_events (
        event_type, actor_id, actor_role, metadata, note
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        "MERCHANT_APPROVED",
        auth.user.id,
        auth.user.role,
        JSON.stringify({ merchantId: merchant.id, name: merchant.name }),
        `Administrator approved merchant outlet: ${merchant.name}`
      ]
    );

    return apiSuccess({
      merchant,
      message: `Shop "${merchant.name}" approved successfully and is now discoverable in the customer marketplace.`
    });
  } catch (err: any) {
    return apiError("APPROVAL_FAILED", err.message || "Failed to approve merchant", 500);
  }
}

