import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;
  const { id } = await params;

  try {
    const updated = await withUserDb(user.id, async (client) => {
      const res = await client.query(
        `UPDATE public.notifications
         SET read_at = timezone('utc'::text, now())
         WHERE id = $1 AND user_id = $2
         RETURNING id, user_id AS "userId", read_at AS "readAt"`,
        [id, user.id]
      );
      return res.rows[0];
    });

    if (!updated) {
      return apiError("NOT_FOUND", "Notification not found or access denied", 404);
    }

    return apiSuccess({ notification: updated });
  } catch (err: any) {
    return apiError("UPDATE_NOTIFICATION_FAILED", err.message || "Failed to mark notification as read", 500);
  }
}

