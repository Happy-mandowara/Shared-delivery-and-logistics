import { NextRequest } from "next/server";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { authenticateRequest } from "@/lib/auth";
import { CancelOrderInputSchema } from "@nationx/shared";

/**
 * POST /api/v1/orders/[id]/cancel
 * Customer or Operations Admin cancels an order prior to final delivery.
 * Triggers suborder cascade cancellation, customer notification, and delivery event audit.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return apiError(auth.error || "UNAUTHORIZED", "Authentication required", auth.status);
    }

    const body = await req.json().catch(() => null);
    const parsed = CancelOrderInputSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid cancel payload", 400, parsed.error.format());
    }

    const { reason, idempotencyKey } = parsed.data;

    const result = await withUserDb(auth.user.id, async (client) => {
      const res = await client.query(
        `SELECT public.fn_cancel_order($1, $2, $3) AS result`,
        [orderId, reason, idempotencyKey || null]
      );
      return res.rows[0].result;
    });

    return apiSuccess({ cancellation: result });
  } catch (err: any) {
    return apiError("CANCELLATION_FAILED", err.message || "Failed to cancel order", 400);
  }
}
