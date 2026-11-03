import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { AcceptSuborderInputSchema, UserRole } from "@nationx/shared";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, [UserRole.MERCHANT, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;
  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = AcceptSuborderInputSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid input for accepting suborder", 400, parsed.error.format());
    }

    const { preparationMinutes, merchantNotes, idempotencyKey } = parsed.data;

    const result = await withUserDb(user.id, async (client) => {
      const queryRes = await client.query(
        `SELECT public.fn_accept_suborder($1, $2, $3, $4) AS outcome`,
        [id, preparationMinutes, merchantNotes || null, idempotencyKey || null]
      );
      return queryRes.rows[0].outcome;
    });

    return apiSuccess(result);
  } catch (err: any) {
    if (err.code === "42501") {
      return apiError("FORBIDDEN", err.message || "Unauthorized to accept this suborder", 403);
    }
    if (err.code === "P0002") {
      return apiError("NOT_FOUND", "Suborder not found", 404);
    }
    if (err.code === "22023") {
      return apiError("INVALID_STATE_TRANSITION", err.message, 400);
    }
    return apiError("INTERNAL_SERVER_ERROR", err.message || "Failed to accept suborder", 500);
  }
}

