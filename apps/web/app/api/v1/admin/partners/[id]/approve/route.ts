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
      `UPDATE public.delivery_partners
       SET verified = true, updated_at = NOW()
       WHERE id = $1
       RETURNING id, user_id, vehicle_type, verified, current_locality`,
      [id]
    );

    if (updateRes.rows.length === 0) {
      return apiError("NOT_FOUND", "Delivery partner not found", 404);
    }

    const partner = updateRes.rows[0];

    // Fetch user name and email
    const userRes = await pool.query(
      `SELECT name, email, phone FROM public.users WHERE id = $1`,
      [partner.user_id]
    );
    const partnerName = userRes.rows[0]?.name || "Delivery Partner";

    // Notify rider via in-app notifications
    await pool.query(
      `INSERT INTO public.notifications (user_id, type, title, message, deep_link)
       VALUES ($1, 'SYSTEM_ALERT', 'Account Verified & Ready!', $2, '/partner')`,
      [
        partner.user_id,
        `Congratulations ${partnerName}! Your rider application has been approved by the Khammam dispatch team. You can now toggle your status to 'AVAILABLE' to accept batch delivery jobs.`
      ]
    );

    // Record audit event in delivery_events
    await pool.query(
      `INSERT INTO public.delivery_events (
        type, actor_id, message, reason, metadata
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        "ADMIN_INTERVENTION",
        auth.user.id,
        `Administrator approved and verified delivery partner: ${partnerName} (${partner.id})`,
        "PARTNER_VERIFIED",
        JSON.stringify({ partnerId: partner.id, userId: partner.user_id, partnerName }),
      ]
    );

    return apiSuccess({
      partner: {
        ...partner,
        full_name: partnerName,
      },
      message: `Delivery partner "${partnerName}" has been successfully verified.`
    });
  } catch (err: any) {
    return apiError("VERIFICATION_FAILED", err.message || "Failed to verify partner", 500);
  }
}

