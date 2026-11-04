import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@nationx/shared";
import { z } from "zod";

const rejectSchema = z.object({
  reason: z.string().min(5, "Rejection reason must be at least 5 characters"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, [UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = rejectSchema.safeParse(body);
    const reason = parsed.success ? parsed.data.reason : "Documentation or business verification criteria not met.";

    const updateRes = await pool.query(
      `UPDATE public.merchants
       SET is_approved = false, is_active = false, updated_at = NOW()
       WHERE id = $1
       RETURNING id, user_id AS "userId", name, code, category, locality, is_approved, is_active`,
      [id]
    );

    if (updateRes.rows.length === 0) {
      return apiError("NOT_FOUND", "Merchant not found", 404);
    }

    const merchant = updateRes.rows[0];

    // Notify merchant owner
    if (merchant.userId) {
      await pool.query(
        `INSERT INTO public.notifications (user_id, type, title, message, deep_link)
         VALUES ($1, 'SYSTEM_ALERT', 'Shop Application Update', $2, '/merchant/onboarding')`,
        [
          merchant.userId,
          `Your application for "${merchant.name}" requires attention: ${reason}`
        ]
      );
    }

    // Record audit event
    await pool.query(
      `INSERT INTO public.delivery_events (
        type, actor_id, message, reason, metadata
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        "ADMIN_INTERVENTION",
        auth.user.id,
        `Administrator rejected merchant outlet: ${merchant.name}. Reason: ${reason}`,
        reason,
        JSON.stringify({ merchantId: merchant.id, name: merchant.name, reason }),
      ]
    );

    return apiSuccess({
      merchant,
      message: `Shop application for "${merchant.name}" has been rejected.`
    });
  } catch (err: any) {
    return apiError("REJECTION_FAILED", err.message || "Failed to reject merchant", 500);
  }
}

