import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@nationx/shared";
import { z } from "zod";

const DuplicateProductSchema = z.object({
  productId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.MERCHANT, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = DuplicateProductSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid productId", 400);
    }

    const { productId } = parsed.data;

    // Fetch source product
    const sourceRes = await pool.query(
      `SELECT p.*, m.user_id 
       FROM public.products p
       JOIN public.merchants m ON p.merchant_id = m.id
       WHERE p.id = $1`,
      [productId]
    );

    if (sourceRes.rows.length === 0) {
      return apiError("NOT_FOUND", "Source product not found", 404);
    }

    const source = sourceRes.rows[0];

    // Ensure ownership if not admin
    if (auth.user.role !== UserRole.ADMIN && source.user_id !== auth.user.id) {
      return apiError("FORBIDDEN", "You do not own this product", 403);
    }

    const copyName = `${source.name} (Copy)`.slice(0, 100);

    const insertRes = await pool.query(
      `INSERT INTO public.products (
        merchant_id,
        name,
        description,
        category,
        price,
        image_url,
        image_urls,
        unit,
        variants,
        weight_grams,
        handling_tag,
        stock_status,
        stock_confirmed_at,
        is_active,
        is_archived
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, timezone('utc'::text, now()), true, false
      ) RETURNING 
        id,
        merchant_id AS "merchantId",
        name,
        description,
        category,
        price,
        image_url AS "imageUrl",
        image_urls AS "imageUrls",
        unit,
        variants,
        weight_grams AS "weightGrams",
        handling_tag AS "handlingTag",
        stock_status AS "stockStatus",
        is_active AS "isActive",
        created_at AS "createdAt"`,
      [
        source.merchant_id,
        copyName,
        source.description,
        source.category,
        source.price,
        source.image_url,
        source.image_urls || '{}',
        source.unit || 'piece',
        source.variants || '[]',
        source.weight_grams || 0,
        source.handling_tag,
        source.stock_status,
      ]
    );

    return apiSuccess({ product: insertRes.rows[0] }, 201);
  } catch (err: any) {
    return apiError("DUPLICATION_FAILED", err.message || "Failed to duplicate product", 500);
  }
}
