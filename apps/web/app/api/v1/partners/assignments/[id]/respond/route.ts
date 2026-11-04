import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { RespondAssignmentInputSchema, UserRole } from "@nationx/shared";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, [UserRole.PARTNER, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;
  const { id } = await params;

  try {
    const rawBody = await req.json();
    const body = {
      ...rawBody,
      accept: rawBody.accept !== undefined ? rawBody.accept : (rawBody.action === "ACCEPT"),
    };
    const parsed = RespondAssignmentInputSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid response payload", 400, parsed.error.format());
    }

    const { accept, reason, idempotencyKey } = parsed.data;

    const result = await withUserDb(user.id, async (client) => {
      const queryRes = await client.query(
        `SELECT public.fn_respond_assignment($1, $2, $3, $4) AS outcome`,
        [id, accept, reason || null, idempotencyKey || null]
      );
      return queryRes.rows[0].outcome;
    });

    return apiSuccess(result);
  } catch (err: any) {
    if (err.code === "42501") {
      return apiError("FORBIDDEN", err.message || "Unauthorized: Caller is not the assigned partner", 403);
    }
    if (err.code === "P0002") {
      return apiError("NOT_FOUND", "Assignment not found", 404);
    }
    if (err.code === "22023") {
      return apiError("INVALID_STATE_TRANSITION", err.message, 400);
    }
    return apiError("INTERNAL_SERVER_ERROR", err.message || "Failed to respond to assignment", 500);
  }
}

