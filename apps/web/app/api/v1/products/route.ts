import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { UserRole } from "@nationx/shared";
import { z } from "zod";

const CreateProductSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional().nullable(),
  category: z.string().min(2).max(50),
  price: z.number().positive(),
  imageUrl: z.string().optional().nullable(),
  imageUrls: z.array(z.string()).optional().default([]),
  unit: z.string().default("piece"),
  variants: z.array(z.object({
    name: z.string(),
    price: z.number().positive(),
    unit: z.string().optional(),
    stockStatus: z.string().optional(),
  })).optional().default([]),
  weightGrams: z.number().int().nonnegative().optional().default(0),
  handlingTag: z.enum(["STANDARD", "FRAGILE", "PERISHABLE", "HOT_FOOD", "COLD_FOOD"]).default("STANDARD"),
  stockStatus: z.enum(["IN_STOCK", "CALL_TO_CONFIRM", "OUT_OF_STOCK"]).default("IN_STOCK"),
  merchantId: z.string().uuid().optional(),
});

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
      WHERE (p.is_archived IS FALSE OR p.is_archived IS NULL)
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
      query += ` AND (p.name ILIKE $${idx} OR p.description ILIKE $${idx})`;
      idx++;
      values.push(`%${search}%`);
    }

    query += ` ORDER BY p.name ASC`;

    const res = await pool.query(query, values);
    return apiSuccess({ products: res.rows });
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch products", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.MERCHANT, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = CreateProductSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid product creation payload", 400, parsed.error.format());
    }

    const {
      name,
      description,
      category,
      price,
      imageUrl,
      imageUrls,
      unit,
      variants,
      weightGrams,
      handlingTag,
      stockStatus,
      merchantId: requestedMerchantId,
    } = parsed.data;

    let targetMerchantId = requestedMerchantId;

    if (auth.user.role === UserRole.MERCHANT) {
      const mRes = await pool.query(
        `SELECT id FROM public.merchants WHERE user_id = $1`,
        [auth.user.id]
      );
      if (mRes.rows.length === 0) {
        return apiError("MERCHANT_NOT_FOUND", "No merchant profile found for this user", 404);
      }
      targetMerchantId = mRes.rows[0].id;
    } else if (!targetMerchantId) {
      return apiError("MERCHANT_ID_REQUIRED", "Admin must specify merchantId", 400);
    }

    const primaryImg = imageUrl || (imageUrls && imageUrls.length > 0 ? imageUrls[0] : null);
    const allImages = imageUrls && imageUrls.length > 0 ? imageUrls : (primaryImg ? [primaryImg] : []);

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
        stock_confirmed_at AS "stockConfirmedAt",
        is_active AS "isActive",
        created_at AS "createdAt"`,
      [
        targetMerchantId,
        name,
        description || null,
        category,
        price,
        primaryImg,
        allImages,
        unit,
        JSON.stringify(variants),
        weightGrams,
        handlingTag,
        stockStatus,
      ]
    );

    return apiSuccess({ product: insertRes.rows[0] }, 201);
  } catch (err: any) {
    return apiError("PRODUCT_CREATION_FAILED", err.message || "Failed to create product", 500);
  }
}
