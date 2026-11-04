import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@nationx/shared";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, [UserRole.MERCHANT, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;

  try {
    const body = await req.json();
    const { stock_status, is_active } = body;

    // Check ownership
    const prodRes = await pool.query(
      `SELECT p.id, p.merchant_id, m.user_id 
       FROM public.products p
       JOIN public.merchants m ON p.merchant_id = m.id
       WHERE p.id = $1`,
      [id]
    );

    if (prodRes.rows.length === 0) {
      return apiError("NOT_FOUND", "Product not found", 404);
    }

    if (auth.user.role !== UserRole.ADMIN && prodRes.rows[0].user_id !== auth.user.id) {
      return apiError("FORBIDDEN", "You do not own this product", 403);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (stock_status !== undefined) {
      updates.push(`stock_status = $${idx++}`);
      values.push(stock_status);
      updates.push(`stock_confirmed_at = timezone('utc'::text, now())`);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(Boolean(is_active));
    }

    updates.push(`updated_at = timezone('utc'::text, now())`);

    values.push(id);
    const updateRes = await pool.query(
      `UPDATE public.products 
       SET ${updates.join(", ")}
       WHERE id = $${idx}
       RETURNING id, name, stock_status AS "stockStatus", is_active AS "isActive", updated_at AS "updatedAt"`,
      values
    );

    return apiSuccess({ product: updateRes.rows[0] });
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to update product", 500);
  }
}


