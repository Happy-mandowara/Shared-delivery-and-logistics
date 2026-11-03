import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { NotificationQuerySchema } from "@nationx/shared";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;
  const { searchParams } = new URL(req.url);

  const parsedQuery = NotificationQuerySchema.safeParse({
    unreadOnly: searchParams.get("unreadOnly") === "true",
    limit: searchParams.get("limit") || 50,
    offset: searchParams.get("offset") || 0,
  });

  const { unreadOnly, limit, offset } = parsedQuery.success
    ? parsedQuery.data
    : { unreadOnly: false, limit: 50, offset: 0 };

  try {
    const result = await withUserDb(user.id, async (client) => {
      let query = `
        SELECT 
          id,
          user_id AS "userId",
          type,
          title,
          message,
          deep_link AS "deepLink",
          order_id AS "orderId",
          suborder_id AS "suborderId",
          batch_id AS "batchId",
          read_at AS "readAt",
          created_at AS "createdAt"
        FROM public.notifications
        WHERE user_id = $1
      `;

      if (unreadOnly) {
        query += ` AND read_at IS NULL`;
      }

      query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;

      const listRes = await client.query(query, [user.id, limit, offset]);

      const countRes = await client.query(
        `SELECT count(*)::int AS "unreadCount" FROM public.notifications WHERE user_id = $1 AND read_at IS NULL`,
        [user.id]
      );

      return {
        notifications: listRes.rows,
        unreadCount: countRes.rows[0]?.unreadCount || 0,
      };
    });

    return apiSuccess(result);
  } catch (err: any) {
    return apiError("FETCH_NOTIFICATIONS_FAILED", err.message || "Failed to fetch notifications", 500);
  }
}

