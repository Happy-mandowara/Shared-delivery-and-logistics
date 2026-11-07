import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { UserRole } from "@nationx/shared";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.MERCHANT, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;

  try {
    const { rows } = await pool.query(
      `SELECT 
         id,
         user_id AS "userId",
         name,
         code,
         category,
         address,
         locality,
         latitude,
         longitude,
         logo_url AS "logoUrl",
         cover_url AS "coverUrl",
         gallery_urls AS "galleryUrls",
         contact_phone AS "contactPhone",
         operating_hours AS "operatingHours",
         rating,
         rating_count AS "ratingCount",
         is_active AS "isActive",
         is_approved AS "isApproved",
         created_at AS "createdAt"
       FROM public.merchants
       WHERE user_id = $1
       LIMIT 1`,
      [user.id]
    );

    if (rows.length === 0) {
      // Fallback for admin or seeded merchant
      const fallback = await pool.query(
        `SELECT 
           id,
           user_id AS "userId",
           name,
           code,
           category,
           address,
           locality,
           latitude,
           longitude,
           logo_url AS "logoUrl",
           cover_url AS "coverUrl",
           gallery_urls AS "galleryUrls",
           contact_phone AS "contactPhone",
           operating_hours AS "operatingHours",
           rating,
           rating_count AS "ratingCount",
           is_active AS "isActive",
           is_approved AS "isApproved",
           created_at AS "createdAt"
         FROM public.merchants
         WHERE is_active = true
         ORDER BY created_at ASC
         LIMIT 1`
      );
      if (fallback.rows.length === 0) {
        return apiError("NOT_FOUND", "No merchant profile found", 404);
      }
      return apiSuccess({ merchant: fallback.rows[0] });
    }

    return apiSuccess({ merchant: rows[0] });
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch merchant profile", 500);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.MERCHANT, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;

  try {
    const body = await req.json();
    const { name, address, locality, logoUrl, coverUrl, contactPhone, operatingHours } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (address !== undefined) {
      updates.push(`address = $${idx++}`);
      values.push(address);
    }
    if (locality !== undefined) {
      updates.push(`locality = $${idx++}`);
      values.push(locality);
    }
    if (logoUrl !== undefined) {
      updates.push(`logo_url = $${idx++}`);
      values.push(logoUrl);
    }
    if (coverUrl !== undefined) {
      updates.push(`cover_url = $${idx++}`);
      values.push(coverUrl);
    }
    if (contactPhone !== undefined) {
      updates.push(`contact_phone = $${idx++}`);
      values.push(contactPhone);
    }
    if (operatingHours !== undefined) {
      updates.push(`operating_hours = $${idx++}`);
      values.push(typeof operatingHours === "string" ? operatingHours : JSON.stringify(operatingHours));
    }

    if (updates.length === 0) {
      return apiError("BAD_REQUEST", "No update fields provided", 400);
    }

    values.push(user.id);
    const sql = `
      UPDATE public.merchants
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE user_id = $${idx}
      RETURNING id, name, logo_url AS "logoUrl", cover_url AS "coverUrl", locality, address
    `;

    const res = await pool.query(sql, values);
    if (res.rows.length === 0) {
      // If user has no directly assigned merchant, update the first merchant as admin fallback
      values[values.length - 1] = undefined;
      const fallbackSql = `
        UPDATE public.merchants
        SET ${updates.join(", ")}, updated_at = NOW()
        WHERE id = (SELECT id FROM public.merchants ORDER BY created_at ASC LIMIT 1)
        RETURNING id, name, logo_url AS "logoUrl", cover_url AS "coverUrl", locality, address
      `;
      const fallbackRes = await pool.query(fallbackSql, values.slice(0, -1));
      return apiSuccess({ merchant: fallbackRes.rows[0] });
    }

    return apiSuccess({ merchant: res.rows[0] });
  } catch (err: any) {
    return apiError("UPDATE_ERROR", err.message || "Failed to update merchant profile", 500);
  }
}

