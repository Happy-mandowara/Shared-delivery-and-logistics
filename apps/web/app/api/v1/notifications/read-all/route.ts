import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;

  try {
    const affectedCount = await withUserDb(user.id, async (client) => {
      const res = await client.query(
        `UPDATE public.notifications
         SET read_at = timezone('utc'::text, now())
         WHERE user_id = $1 AND read_at IS NULL
         RETURNING id`,
        [user.id]
      );
      return res.rowCount || 0;
    });

    return apiSuccess({
      message: `Marked ${affectedCount} notifications as read`,
      markedCount: affectedCount,
    });
  } catch (err: any) {
    return apiError("UPDATE_NOTIFICATIONS_FAILED", err.message || "Failed to mark all as read", 500);
  }
}

