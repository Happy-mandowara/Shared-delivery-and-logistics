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
    const reason = parsed.success ? parsed.data.reason : "Driver documentation or background verification criteria not met.";

    const updateRes = await pool.query(
      `UPDATE public.delivery_partners
       SET verified = false, availability = 'OFFLINE', updated_at = NOW()
       WHERE id = $1
       RETURNING id, user_id, vehicle_type, verified, current_locality`,
      [id]
    );

    if (updateRes.rows.length === 0) {
      return apiError("NOT_FOUND", "Delivery partner not found", 404);
    }

    const partner = updateRes.rows[0];

    // Fetch user details
    const userRes = await pool.query(
      `SELECT name, email FROM public.users WHERE id = $1`,
      [partner.user_id]
    );
    const partnerName = userRes.rows[0]?.name || "Delivery Partner";

    // Notify rider
    await pool.query(
      `INSERT INTO public.notifications (user_id, type, title, message, deep_link)
       VALUES ($1, 'SYSTEM_ALERT', 'Partner Application Update', $2, '/register/partner')`,
      [
        partner.user_id,
        `Your rider application for Khammam logistics was not approved: ${reason}`
      ]
    );

    // Record audit event
    await pool.query(
      `INSERT INTO public.delivery_events (
        type, actor_id, message, reason, metadata
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        "ADMIN_INTERVENTION",
        auth.user.id,
        `Administrator rejected delivery partner application: ${partnerName}. Reason: ${reason}`,
        reason,
        JSON.stringify({ partnerId: partner.id, userId: partner.user_id, partnerName, reason }),
      ]
    );

    return apiSuccess({
      partner: {
        ...partner,
        full_name: partnerName,
      },
      message: `Delivery partner application for "${partnerName}" has been rejected.`
    });
  } catch (err: any) {
    return apiError("REJECTION_FAILED", err.message || "Failed to reject partner application", 500);
  }
}

