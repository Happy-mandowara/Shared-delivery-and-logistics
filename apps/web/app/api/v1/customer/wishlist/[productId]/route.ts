import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@nationx/shared";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const auth = await requireAuth(req, [UserRole.CUSTOMER, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { productId } = await params;

  try {
    const res = await pool.query(
      `DELETE FROM public.customer_wishlists
       WHERE customer_id = $1 AND product_id = $2
       RETURNING id`,
      [auth.user.id, productId]
    );

    return apiSuccess({ removed: res.rowCount ? res.rowCount > 0 : true, productId });
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to remove from wishlist", 500);
  }
}

