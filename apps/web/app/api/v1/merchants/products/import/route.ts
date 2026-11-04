import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@nationx/shared";
import { z } from "zod";

const BulkImportItemSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional().nullable(),
  category: z.string().min(2).max(50),
  price: z.coerce.number().positive(),
  imageUrl: z.string().optional().nullable(),
  unit: z.string().default("piece"),
  handlingTag: z.enum(["STANDARD", "FRAGILE", "PERISHABLE", "HOT_FOOD", "COLD_FOOD"]).default("STANDARD"),
  stockStatus: z.enum(["IN_STOCK", "CALL_TO_CONFIRM", "OUT_OF_STOCK"]).default("IN_STOCK"),
});

const BulkImportSchema = z.object({
  items: z.array(BulkImportItemSchema).optional(),
  products: z.array(BulkImportItemSchema).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.MERCHANT, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const mRes = await pool.query(
      `SELECT id FROM public.merchants WHERE user_id = $1`,
      [auth.user.id]
    );

    if (mRes.rows.length === 0 && auth.user.role !== UserRole.ADMIN) {
      return apiError("MERCHANT_NOT_FOUND", "No merchant profile found for this user", 404);
    }

    const merchantId = mRes.rows[0]?.id;

    const body = await req.json();
    const parsed = BulkImportSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid bulk import payload", 400, parsed.error.format());
    }

    const items = parsed.data.items || parsed.data.products || [];
    if (items.length === 0) {
      return apiError("VALIDATION_ERROR", "At least one item/product must be provided", 400);
    }
    const insertedIds: string[] = [];

    for (const item of items) {
      const res = await pool.query(
        `INSERT INTO public.products (
          merchant_id,
          name,
          description,
          category,
          price,
          image_url,
          image_urls,
          unit,
          handling_tag,
          stock_status,
          stock_confirmed_at,
          is_active,
          is_archived
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, timezone('utc'::text, now()), true, false
        ) RETURNING id`,
        [
          merchantId,
          item.name,
          item.description || null,
          item.category,
          item.price,
          item.imageUrl || null,
          item.imageUrl ? [item.imageUrl] : [],
          item.unit,
          item.handlingTag,
          item.stockStatus,
        ]
      );
      insertedIds.push(res.rows[0].id);
    }

    return apiSuccess({
      importedCount: insertedIds.length,
      productIds: insertedIds,
    }, 201);
  } catch (err: any) {
    return apiError("IMPORT_FAILED", err.message || "Failed to process bulk import", 500);
  }
}
