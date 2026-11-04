import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { authenticateRequest } from "@/lib/auth";
import { UserRole } from "@nationx/shared";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchantIdParam = searchParams.get("merchantId");
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  // Optional auth
  const { user } = await authenticateRequest(req);

  try {
    let merchantId = merchantIdParam;

    // If caller is a merchant and didn't specify another merchantId, default to their own shop
    if (!merchantId && user && user.role === UserRole.MERCHANT) {
      const mRes = await pool.query(
        `SELECT id FROM public.merchants WHERE user_id = $1`,
        [user.id]
      );
      if (mRes.rows.length > 0) {
        merchantId = mRes.rows[0].id;
      }
    }

    let query = `
      SELECT 
        p.id,
        p.merchant_id AS "merchantId",
        m.name AS "merchantName",
        m.locality AS "merchantLocality",
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
      WHERE 1=1
    `;

    const values: any[] = [];
    let idx = 1;

    if (merchantId) {
      query += ` AND p.merchant_id = $${idx++}`;
      values.push(merchantId);
    } else {
      // For general public marketplace, only show active products
      query += ` AND p.is_active = true`;
    }

    if (category && category !== "ALL") {
      query += ` AND p.category = $${idx++}`;
      values.push(category);
    }

    if (search) {
      query += ` AND p.name ILIKE $${idx++}`;
      values.push(`%${search}%`);
    }

    query += ` ORDER BY p.name ASC`;

    const res = await pool.query(query, values);
    return apiSuccess({ products: res.rows });
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch products", 500);
  }
}
