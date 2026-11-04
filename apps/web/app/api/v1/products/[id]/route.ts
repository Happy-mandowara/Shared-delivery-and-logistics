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
         p.image_urls AS "imageUrls",
         p.unit,
         p.variants,
         p.weight_grams AS "weightGrams",
         p.handling_tag AS "handlingTag",
         CASE 
           WHEN p.stock_status = 'OUT_OF_STOCK' THEN 'OUT_OF_STOCK'
           WHEN p.stock_confirmed_at < (timezone('utc'::text, now()) - INTERVAL '3 days') THEN 'CALL_TO_CONFIRM'
           ELSE p.stock_status
         END AS "stockStatus",
         p.stock_confirmed_at AS "stockConfirmedAt",
         p.is_active AS "isActive",
         p.is_archived AS "isArchived",
         p.created_at AS "createdAt",
         p.updated_at AS "updatedAt"
       FROM public.products p
       JOIN public.merchants m ON p.merchant_id = m.id
       WHERE p.id = $1 AND (p.is_archived IS FALSE OR p.is_archived IS NULL)`,
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

    if (body.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(body.name);
    }

    if (body.description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(body.description);
    }

    if (body.category !== undefined) {
      updates.push(`category = $${idx++}`);
      values.push(body.category);
    }

    if (body.price !== undefined) {
      updates.push(`price = $${idx++}`);
      values.push(Number(body.price));
    }

    if (body.imageUrl !== undefined || body.image_url !== undefined) {
      updates.push(`image_url = $${idx++}`);
      values.push(body.imageUrl || body.image_url);
    }

    if (body.imageUrls !== undefined || body.image_urls !== undefined) {
      updates.push(`image_urls = $${idx++}`);
      values.push(body.imageUrls || body.image_urls);
    }

    if (body.unit !== undefined) {
      updates.push(`unit = $${idx++}`);
      values.push(body.unit);
    }

    if (body.variants !== undefined) {
      updates.push(`variants = $${idx++}`);
      values.push(JSON.stringify(body.variants));
    }

    if (body.weightGrams !== undefined || body.weight_grams !== undefined) {
      updates.push(`weight_grams = $${idx++}`);
      values.push(Number(body.weightGrams || body.weight_grams));
    }

    if (body.handlingTag !== undefined || body.handling_tag !== undefined) {
      updates.push(`handling_tag = $${idx++}`);
      values.push(body.handlingTag || body.handling_tag);
    }

    if (body.stock_status !== undefined || body.stockStatus !== undefined) {
      updates.push(`stock_status = $${idx++}`);
      values.push(body.stock_status || body.stockStatus);
      updates.push(`stock_confirmed_at = timezone('utc'::text, now())`);
    }

    if (body.is_active !== undefined || body.isActive !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(Boolean(body.is_active ?? body.isActive));
    }

    if (body.is_archived !== undefined || body.isArchived !== undefined) {
      updates.push(`is_archived = $${idx++}`);
      values.push(Boolean(body.is_archived ?? body.isArchived));
    }

    updates.push(`updated_at = timezone('utc'::text, now())`);

    values.push(id);
    const updateRes = await pool.query(
      `UPDATE public.products 
       SET ${updates.join(", ")}
       WHERE id = $${idx}
       RETURNING 
         id, 
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
         is_archived AS "isArchived",
         updated_at AS "updatedAt"`,
      values
    );

    return apiSuccess({ product: updateRes.rows[0] });
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to update product", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, [UserRole.MERCHANT, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;

  try {
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

    // Soft delete / archive
    await pool.query(
      `UPDATE public.products 
       SET is_archived = true, is_active = false, updated_at = timezone('utc'::text, now())
       WHERE id = $1`,
      [id]
    );

    return apiSuccess({ message: "Product archived successfully", id });
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to archive product", 500);
  }
}
