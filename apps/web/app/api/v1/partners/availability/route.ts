import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { authenticateRequest } from "@/lib/auth";
import { PartnerAvailabilityInputSchema } from "@nationx/shared";

/**
 * PATCH /api/v1/partners/availability
 * Authenticated delivery partner updates their active availability state and current locality.
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return apiError(auth.error || "UNAUTHORIZED", "Authentication required", auth.status);
    }

    if (auth.user.role !== "PARTNER" && auth.user.role !== "ADMIN") {
      return apiError("FORBIDDEN", "Only delivery partners or dispatch ops can update availability", 403);
    }

    const body = await req.json().catch(() => null);
    const parsed = PartnerAvailabilityInputSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid availability payload", 400, parsed.error.format());
    }

    const { availability, currentLocality, latitude, longitude } = parsed.data;

    // Find delivery partner record
    const partnerRes = await pool.query(
      `SELECT id, verified FROM public.delivery_partners WHERE user_id = $1`,
      [auth.user.id]
    );

    if (partnerRes.rowCount === 0) {
      return apiError("PARTNER_NOT_FOUND", "Partner profile not found for authenticated user", 404);
    }

    const partner = partnerRes.rows[0];

    // Enforce administrative verification before going online
    if (availability === "AVAILABLE" && !partner.verified && auth.user.role !== "ADMIN") {
      return apiError(
        "UNVERIFIED_PARTNER",
        "Your delivery partner account is pending administrative verification. You cannot go online until your documents and profile are reviewed and approved.",
        403
      );
    }

    const partnerId = partner.id;

    // Update partner record
    const updateRes = await pool.query(
      `UPDATE public.delivery_partners
       SET 
         availability = $1,
         current_locality = coalesce($2, current_locality),
         latitude = coalesce($3, latitude),
         longitude = coalesce($4, longitude),
         updated_at = timezone('utc'::text, now())
       WHERE id = $5
       RETURNING id, availability, current_locality, latitude, longitude, updated_at`,
      [availability, currentLocality || null, latitude ?? null, longitude ?? null, partnerId]
    );

    return apiSuccess({
      partner: {
        id: updateRes.rows[0].id,
        availability: updateRes.rows[0].availability,
        currentLocality: updateRes.rows[0].current_locality,
        latitude: updateRes.rows[0].latitude,
        longitude: updateRes.rows[0].longitude,
        updatedAt: updateRes.rows[0].updated_at,
      },
    });
  } catch (err: any) {
    return apiError("SERVER_ERROR", err.message || "Failed to update availability", 500);
  }
}

