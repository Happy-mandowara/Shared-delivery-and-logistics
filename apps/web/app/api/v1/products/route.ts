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
  image_url: z.string().optional().nullable(),
  imageUrls: z.array(z.string()).optional().default([]),
  image_urls: z.array(z.string()).optional().default([]),
  unit: z.string().default("piece"),
  variants: z.array(z.object({
    name: z.string(),
    price: z.number().positive(),
    unit: z.string().optional(),
    stockStatus: z.string().optional(),
    stock_status: z.string().optional(),
  })).optional().default([]),
  weightGrams: z.number().int().nonnegative().optional(),
  weight_grams: z.number().int().nonnegative().optional(),
  handlingTag: z.enum(["STANDARD", "FRAGILE", "PERISHABLE", "HOT_FOOD", "COLD_FOOD"]).optional(),
  handling_requirements: z.enum(["STANDARD", "FRAGILE", "PERISHABLE", "HOT_FOOD", "COLD_FOOD"]).optional(),
  handling_tag: z.enum(["STANDARD", "FRAGILE", "PERISHABLE", "HOT_FOOD", "COLD_FOOD"]).optional(),
  stockStatus: z.enum(["IN_STOCK", "CALL_TO_CONFIRM", "OUT_OF_STOCK"]).optional(),
  stock_status: z.enum(["IN_STOCK", "CALL_TO_CONFIRM", "OUT_OF_STOCK"]).optional(),
  merchantId: z.string().uuid().optional(),
  merchant_id: z.string().uuid().optional(),
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
    const products = res.rows.map((row) => {
      const img = row.imageUrl || row.image_url || null;
      const imgs = (row.imageUrls && row.imageUrls.length > 0) ? row.imageUrls : (row.image_urls || (img ? [img] : []));
      return {
        ...row,
        imageUrl: img,
        image_url: img,
        imageUrls: imgs,
        image_urls: imgs,
        merchantId: row.merchantId || row.merchant_id,
        merchant_id: row.merchantId || row.merchant_id,
        weightGrams: row.weightGrams ?? row.weight_grams ?? 0,
        weight_grams: row.weightGrams ?? row.weight_grams ?? 0,
        handlingTag: row.handlingTag || row.handling_tag || "STANDARD",
        handling_tag: row.handlingTag || row.handling_tag || "STANDARD",
        stockStatus: row.stockStatus || row.stock_status || "IN_STOCK",
        stock_status: row.stockStatus || row.stock_status || "IN_STOCK",
        price: row.price !== null && row.price !== undefined ? Number(row.price) : null,
        variants: Array.isArray(row.variants)
          ? row.variants.map((v: any) => ({
              ...v,
              price: v.price !== null && v.price !== undefined ? Number(v.price) : null,
            }))
          : row.variants,
      };
    });

    return apiSuccess({ products });
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
      image_url,
      imageUrls,
      image_urls,
      unit,
      variants,
      weightGrams,
      weight_grams,
      handlingTag,
      handling_requirements,
      handling_tag,
      stockStatus,
      stock_status,
      merchantId: requestedMerchantId,
      merchant_id: requestedMerchantIdSnake,
    } = parsed.data;

    const finalWeightGrams = weightGrams ?? weight_grams ?? 0;
    const finalHandlingTag = handlingTag || handling_requirements || handling_tag || "STANDARD";
    const finalStockStatus = stockStatus || stock_status || "IN_STOCK";

    const candidateUrls = [
      ...(Array.isArray(imageUrls) ? imageUrls : []),
      ...(Array.isArray(image_urls) ? image_urls : []),
    ].filter(Boolean);

    const primaryImg = imageUrl || image_url || (candidateUrls.length > 0 ? candidateUrls[0] : null);
    const allImages = candidateUrls.length > 0 ? candidateUrls : (primaryImg ? [primaryImg] : []);

    let targetMerchantId = requestedMerchantId || requestedMerchantIdSnake;

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
        finalWeightGrams,
        finalHandlingTag,
        finalStockStatus,
      ]
    );

    const created = insertRes.rows[0];
    const normalizedProduct = {
      ...created,
      imageUrl: created.imageUrl || primaryImg,
      image_url: created.imageUrl || primaryImg,
      imageUrls: created.imageUrls || allImages,
      image_urls: created.imageUrls || allImages,
      merchantId: created.merchantId,
      merchant_id: created.merchantId,
      weightGrams: created.weightGrams,
      weight_grams: created.weightGrams,
      handlingTag: created.handlingTag,
      handling_tag: created.handlingTag,
      stockStatus: created.stockStatus,
      stock_status: created.stockStatus,
    };

    return apiSuccess({ product: normalizedProduct }, 201);
  } catch (err: any) {
    return apiError("PRODUCT_CREATION_FAILED", err.message || "Failed to create product", 500);
  }
}
