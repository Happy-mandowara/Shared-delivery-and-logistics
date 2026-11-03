import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const res = await pool.query(
      `SELECT 
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
       WHERE m.id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      return apiError("NOT_FOUND", "Merchant not found", 404);
    }

    return apiSuccess({ merchant: res.rows[0] });
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch merchant details", 500);
  }
}

