import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { UpdateStopStatusInputSchema, UserRole } from "@nationx/shared";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, [UserRole.PARTNER, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = UpdateStopStatusInputSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid stop status update payload", 400, parsed.error.format());
    }

    const { status, failureReason, proofOfDeliveryCode, idempotencyKey } = parsed.data;

    const result = await withUserDb(user.id, async (client) => {
      const queryRes = await client.query(
        `SELECT public.fn_update_stop_status($1, $2, $3, $4, $5) AS outcome`,
        [id, status, failureReason || null, proofOfDeliveryCode || null, idempotencyKey || null]
      );
      return queryRes.rows[0].outcome;
    });

    if (result && result.error_code) {
      if (result.error_code === "MAX_ATTEMPTS_EXCEEDED") {
        return apiError("MAX_ATTEMPTS_EXCEEDED", result.message, 429, { attempts: result.attempts });
      }
      if (result.error_code === "MISSING_POD_CODE") {
        return apiError("MISSING_POD_CODE", result.message, 400);
      }
      if (result.error_code === "INVALID_POD_CODE") {
        return apiError("INVALID_POD_CODE", result.message, 400, { attempts: result.attempts });
      }
      return apiError(result.error_code, result.message, 400);
    }

    return apiSuccess(result);
  } catch (err: any) {
    if (err.code === "42501") {
      return apiError("FORBIDDEN", err.message || "Unauthorized: Caller is not the assigned partner", 403);
    }
    if (err.code === "P0002") {
      return apiError("NOT_FOUND", "Delivery stop not found", 404);
    }
    if (err.code === "22023") {
      if (err.message.includes("INVALID_POD_CODE")) {
        return apiError("INVALID_POD_CODE", err.message, 400);
      }
      if (err.message.includes("MAX_ATTEMPTS_EXCEEDED")) {
        return apiError("MAX_ATTEMPTS_EXCEEDED", err.message, 429);
      }
      if (err.message.includes("MISSING_POD_CODE")) {
        return apiError("MISSING_POD_CODE", err.message, 400);
      }
      if (err.message.includes("PRECONDITION_FAILED")) {
        return apiError("PRECONDITION_FAILED", err.message, 400);
      }
      return apiError("INVALID_STATE_TRANSITION", err.message, 400);
    }
    return apiError("INTERNAL_SERVER_ERROR", err.message || "Failed to update stop status", 500);
  }
}

