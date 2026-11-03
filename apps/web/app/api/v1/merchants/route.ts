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
        m.address,
        m.locality,
        m.latitude,
        m.longitude,
        m.is_active AS "isActive",
        (
          SELECT count(*)::int 
          FROM public.products p 
          WHERE p.merchant_id = m.id AND p.is_active = true
        ) AS "productCount"
      FROM public.merchants m
      WHERE m.is_active = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (locality) {
      query += ` AND LOWER(m.locality) = LOWER($${paramIndex++})`;
      params.push(locality);
    }

    if (search) {
      query += ` AND (m.name ILIKE $${paramIndex} OR m.locality ILIKE $${paramIndex})`;
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

