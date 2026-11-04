import { NextRequest } from "next/server";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { authenticateRequest } from "@/lib/auth";
import { StopExceptionInputSchema } from "@nationx/shared";

/**
 * POST /api/v1/stops/[id]/exception
 * Record a failed stop attempt (customer unreachable, refused delivery, merchant closed)
 * and trigger return stop generation and customer notification.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stopId } = await params;
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return apiError(auth.error || "UNAUTHORIZED", "Authentication required", auth.status);
    }

    if (auth.user.role !== "PARTNER" && auth.user.role !== "ADMIN") {
      return apiError("FORBIDDEN", "Only assigned delivery partners or dispatch ops can record stop exceptions", 403);
    }

    const body = await req.json().catch(() => null);
    const parsed = StopExceptionInputSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid stop exception payload", 400, parsed.error.format());
    }

    const { reason, createReturnStop, idempotencyKey } = parsed.data;

    const result = await withUserDb(auth.user.id, async (client) => {
      const res = await client.query(
        `SELECT public.fn_handle_delivery_exception($1, $2, $3, $4) AS result`,
        [stopId, reason, createReturnStop, idempotencyKey || null]
      );
      return res.rows[0].result;
    });

    return apiSuccess({ exception: result });
  } catch (err: any) {
    return apiError("EXCEPTION_HANDLING_FAILED", err.message || "Failed to record stop exception", 400);
  }
}
