import { NextRequest } from "next/server";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { authenticateRequest } from "@/lib/auth";
import { ReassignPartnerInputSchema } from "@nationx/shared";

/**
 * POST /api/v1/batches/[id]/reassign
 * Reassign an offered or in-progress batch from one delivery partner to another.
 * Admin only, audit event generated.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batchId } = await params;
    const auth = await authenticateRequest(req);
    if (!auth.user || auth.user.role !== "ADMIN") {
      return apiError("FORBIDDEN", "Only dispatch operations can reassign delivery batches", 403);
    }

    const body = await req.json().catch(() => null);
    const parsed = ReassignPartnerInputSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid reassignment payload", 400, parsed.error.format());
    }

    const { newPartnerId, reason, idempotencyKey } = parsed.data;

    const result = await withUserDb(auth.user.id, async (client) => {
      const res = await client.query(
        `SELECT public.fn_reassign_batch($1, $2, $3, $4) AS result`,
        [batchId, newPartnerId, reason, idempotencyKey || null]
      );
      return res.rows[0].result;
    });

    return apiSuccess({ reassignment: result });
  } catch (err: any) {
    return apiError("REASSIGNMENT_FAILED", err.message || "Failed to reassign batch", 400);
  }
}
