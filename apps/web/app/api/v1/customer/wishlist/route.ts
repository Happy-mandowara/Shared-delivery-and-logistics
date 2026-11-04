import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@nationx/shared";
import { z } from "zod";

const AddWishlistSchema = z.object({
  productId: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.CUSTOMER, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const res = await pool.query(
      `SELECT 
         w.id AS "wishlistId",
         w.created_at AS "savedAt",
         p.id,
         p.name,
         p.description,
         p.category,
         p.price,
         p.image_url AS "imageUrl",
         p.image_urls AS "imageUrls",
         p.unit,
         p.handling_tag AS "handlingTag",
         p.stock_status AS "stockStatus",
         p.is_active AS "isActive",
         m.id AS "merchantId",
         m.name AS "merchantName",
         m.locality AS "merchantLocality"
       FROM public.customer_wishlists w
       JOIN public.products p ON w.product_id = p.id
       JOIN public.merchants m ON p.merchant_id = m.id
       WHERE w.customer_id = $1 AND (p.is_archived IS FALSE OR p.is_archived IS NULL)
       ORDER BY w.created_at DESC`,
      [auth.user.id]
    );

    return apiSuccess({ wishlist: res.rows });
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch wishlist", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.CUSTOMER, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = AddWishlistSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid product ID", 400);
    }

    const { productId } = parsed.data;

    const res = await pool.query(
      `INSERT INTO public.customer_wishlists (customer_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (customer_id, product_id) DO NOTHING
       RETURNING id, customer_id AS "customerId", product_id AS "productId", created_at AS "createdAt"`,
      [auth.user.id, productId]
    );

    return apiSuccess({ 
      saved: true, 
      item: res.rows[0] || { customerId: auth.user.id, productId } 
    }, 201);
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to add to wishlist", 500);
  }
}

