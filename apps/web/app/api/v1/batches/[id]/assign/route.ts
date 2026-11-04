import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { z } from "zod";
import { UserRole } from "@nationx/shared";

const AssignPartnerSchema = z.object({
  partnerId: z.string().uuid(),
  idempotencyKey: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, [UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = AssignPartnerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid assignment input", 400, parsed.error.format());
    }

    const { partnerId, idempotencyKey } = parsed.data;

    const result = await withUserDb(user.id, async (client) => {
      // 1. Check partner availability and verification
      const partnerRes = await client.query(
        `SELECT id, availability, capacity_units, verified FROM public.delivery_partners WHERE id = $1`,
        [partnerId]
      );

      if (partnerRes.rows.length === 0) {
        throw new Error("Delivery partner not found");
      }

      const partner = partnerRes.rows[0];
      if (!partner.verified) {
        throw new Error("Delivery partner has not been verified and approved by administration");
      }
      if (partner.availability !== "AVAILABLE") {
        throw new Error(`Partner is not currently available (status: ${partner.availability})`);
      }

      // 2. Call SECURITY DEFINER fn_assign_batch
      const queryRes = await client.query(
        `SELECT public.fn_assign_batch($1, $2, $3) AS outcome`,
        [id, partnerId, idempotencyKey || null]
      );

      return queryRes.rows[0].outcome;
    });

    return apiSuccess(result);
  } catch (err: any) {
    if (err.code === "42501") {
      return apiError("FORBIDDEN", err.message, 403);
    }
    return apiError("ASSIGNMENT_FAILED", err.message || "Failed to assign batch", 400);
  }
}

