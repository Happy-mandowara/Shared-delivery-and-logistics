import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const res = await pool.query(
      `SELECT 
         p.id,
         p.merchant_id AS "merchantId",
         m.name AS "merchantName",
         m.locality AS "merchantLocality",
         m.address AS "merchantAddress",
         p.name,
         p.description,
         p.category,
         p.price,
         p.image_url AS "imageUrl",
         p.handling_tag AS "handlingTag",
         CASE 
           WHEN p.stock_status = 'OUT_OF_STOCK' THEN 'OUT_OF_STOCK'
           WHEN p.stock_confirmed_at < (timezone('utc'::text, now()) - INTERVAL '3 days') THEN 'CALL_TO_CONFIRM'
           ELSE p.stock_status
         END AS "stockStatus",
         p.stock_confirmed_at AS "stockConfirmedAt",
         p.is_active AS "isActive",
         p.created_at AS "createdAt",
         p.updated_at AS "updatedAt"
       FROM public.products p
       JOIN public.merchants m ON p.merchant_id = m.id
       WHERE p.id = $1 AND p.is_active = true`,
      [id]
    );

    if (res.rows.length === 0) {
      return apiError("NOT_FOUND", "Product not found or unavailable", 404);
    }

    return apiSuccess({ product: res.rows[0] });
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch product details", 500);
  }
}

