import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    // 1. Categories with their corresponding stores
    const categoriesWithStoresRes = await pool.query(`
      SELECT 
        COALESCE(m.category, 'General Store') as category,
        COUNT(m.id)::int as "merchantCount",
        json_agg(
          json_build_object(
            'id', m.id,
            'name', m.name,
            'code', m.code,
            'locality', m.locality,
            'address', m.address,
            'logoUrl', m.logo_url,
            'coverUrl', m.cover_url,
            'rating', m.rating,
            'ratingCount', m.rating_count,
            'productCount', (
              SELECT count(*)::int FROM public.products p 
              WHERE p.merchant_id = m.id AND p.is_active = true AND (p.is_archived IS FALSE OR p.is_archived IS NULL)
            )
          ) ORDER BY m.rating DESC NULLS LAST, m.name ASC
        ) as merchants
      FROM public.merchants m
      WHERE m.is_active = true AND (m.is_approved IS TRUE OR m.is_approved IS NULL)
      GROUP BY m.category
      ORDER BY "merchantCount" DESC, m.category ASC
    `);

    // 2. Product categories with counts
    const productCatsRes = await pool.query(`
      SELECT 
        COALESCE(p.category, 'General') as name,
        COUNT(*)::int as "productCount"
      FROM public.products p
      JOIN public.merchants m ON p.merchant_id = m.id
      WHERE p.is_active = true 
        AND (p.is_archived IS FALSE OR p.is_archived IS NULL)
        AND m.is_active = true 
        AND (m.is_approved IS TRUE OR m.is_approved IS NULL)
      GROUP BY p.category
      ORDER BY "productCount" DESC, name ASC
    `);

    // 3. Active localities in Khammam
    const localitiesRes = await pool.query(`
      SELECT 
        locality as name,
        COUNT(*)::int as "merchantCount"
      FROM public.merchants
      WHERE is_active = true AND (is_approved IS TRUE OR is_approved IS NULL)
      GROUP BY locality
      ORDER BY "merchantCount" DESC, name ASC
    `);

    return apiSuccess({
      categoriesWithStores: categoriesWithStoresRes.rows,
      merchantCategories: categoriesWithStoresRes.rows.map(r => ({
        name: r.category,
        merchantCount: r.merchantCount
      })),
      productCategories: productCatsRes.rows,
      localities: localitiesRes.rows,
    });
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch categories", 500);
  }
}
