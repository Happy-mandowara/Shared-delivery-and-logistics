import { NextRequest } from "next/server";
import { pool, withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { CreateProductInputSchema, UserRole } from "@nationx/shared";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const offset = (page - 1) * limit;

  try {
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
      WHERE p.merchant_id = $1 AND p.is_active = true
    `;

    const queryParams: any[] = [id];
    let paramIndex = 2;

    if (category) {
      query += ` AND LOWER(p.category) = LOWER($${paramIndex++})`;
      queryParams.push(category);
    }

    if (search) {
      query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY p.category ASC, p.name ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const res = await pool.query(query, queryParams);

    // Also get categories list for convenient client filter pills
    const catRes = await pool.query(
      `SELECT DISTINCT category FROM public.products WHERE merchant_id = $1 AND is_active = true ORDER BY category ASC`,
      [id]
    );

    return apiSuccess({
      products: res.rows,
      categories: catRes.rows.map((r) => r.category),
      pagination: {
        page,
        limit,
        count: res.rows.length,
      },
    });
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch merchant products", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, [UserRole.MERCHANT, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = CreateProductInputSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid product creation input", 400, parsed.error.format());
    }

    const { name, description, category, price, imageUrl, handlingTag, stockStatus, isActive } = parsed.data;

    const result = await withUserDb(user.id, async (client) => {
      // Authorization: Check if caller owns this merchant shop or is admin
      if (user.role !== UserRole.ADMIN) {
        const ownerCheck = await client.query(
          `SELECT id FROM public.merchants WHERE id = $1 AND user_id = $2`,
          [id, user.id]
        );
        if (ownerCheck.rows.length === 0) {
          throw new Error("Unauthorized: Caller does not own this merchant shop");
        }
      }

      const insertRes = await client.query(
        `INSERT INTO public.products (
           merchant_id, name, description, category, price, image_url, handling_tag, stock_status, is_active
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, merchant_id AS "merchantId", name, price, stock_status AS "stockStatus", is_active AS "isActive"`,
        [id, name, description || null, category, price, imageUrl || null, handlingTag, stockStatus, isActive]
      );

      return insertRes.rows[0];
    });

    return apiSuccess(result, 201);
  } catch (err: any) {
    if (err.message.includes("Unauthorized")) {
      return apiError("FORBIDDEN", err.message, 403);
    }
    return apiError("CREATE_PRODUCT_FAILED", err.message || "Failed to create product", 500);
  }
}

