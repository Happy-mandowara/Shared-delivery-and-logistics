import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locality = searchParams.get("locality");
  const search = searchParams.get("search");

  try {
    let query = `
      SELECT 
        m.id,
        m.name,
        m.code,
        m.category,
        m.address,
        m.locality,
        m.latitude,
        m.longitude,
        m.logo_url AS "logoUrl",
        m.cover_url AS "coverUrl",
        m.gallery_urls AS "galleryUrls",
        m.contact_phone AS "contactPhone",
        m.operating_hours AS "operatingHours",
        m.rating,
        m.rating_count AS "ratingCount",
        m.is_active AS "isActive",
        m.is_approved AS "isApproved",
        (
          SELECT count(*)::int 
          FROM public.products p 
          WHERE p.merchant_id = m.id AND p.is_active = true AND (p.is_archived IS FALSE OR p.is_archived IS NULL)
        ) AS "productCount"
      FROM public.merchants m
      WHERE m.is_active = true AND (m.is_approved IS TRUE OR m.is_approved IS NULL)
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (locality) {
      query += ` AND LOWER(m.locality) = LOWER($${paramIndex++})`;
      params.push(locality);
    }

    if (search) {
      query += ` AND (m.name ILIKE $${paramIndex} OR m.locality ILIKE $${paramIndex} OR m.category ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY m.name ASC`;

    const res = await pool.query(query, params);

    return apiSuccess({ merchants: res.rows });
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch merchants", 500);
  }
}
