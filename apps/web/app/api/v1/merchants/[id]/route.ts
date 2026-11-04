import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@nationx/shared";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let condition = "m.id = $1";
    if (!isUuid) {
      condition = "(m.code = $1 OR LOWER(m.code) = LOWER($1) OR LOWER(REPLACE(m.name, ' ', '-')) = LOWER($1))";
    }

    const res = await pool.query(
      `SELECT 
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
       WHERE ${condition}`,
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, [UserRole.MERCHANT, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;

  try {
    const merchantRes = await pool.query(
      `SELECT id, user_id FROM public.merchants WHERE id = $1`,
      [id]
    );

    if (merchantRes.rows.length === 0) {
      return apiError("NOT_FOUND", "Merchant not found", 404);
    }

    if (auth.user.role !== UserRole.ADMIN && merchantRes.rows[0].user_id !== auth.user.id) {
      return apiError("FORBIDDEN", "You do not own this merchant profile", 403);
    }

    const body = await req.json();
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(body.name);
    }

    if (body.category !== undefined) {
      updates.push(`category = $${idx++}`);
      values.push(body.category);
    }

    if (body.address !== undefined) {
      updates.push(`address = $${idx++}`);
      values.push(body.address);
    }

    if (body.locality !== undefined) {
      updates.push(`locality = $${idx++}`);
      values.push(body.locality);
    }

    if (body.contactPhone !== undefined || body.contact_phone !== undefined) {
      updates.push(`contact_phone = $${idx++}`);
      values.push(body.contactPhone || body.contact_phone);
    }

    if (body.logoUrl !== undefined || body.logo_url !== undefined) {
      updates.push(`logo_url = $${idx++}`);
      values.push(body.logoUrl || body.logo_url);
    }

    if (body.coverUrl !== undefined || body.cover_url !== undefined) {
      updates.push(`cover_url = $${idx++}`);
      values.push(body.coverUrl || body.cover_url);
    }

    if (body.galleryUrls !== undefined || body.gallery_urls !== undefined) {
      updates.push(`gallery_urls = $${idx++}`);
      values.push(body.galleryUrls || body.gallery_urls);
    }

    if (body.operatingHours !== undefined || body.operating_hours !== undefined) {
      updates.push(`operating_hours = $${idx++}`);
      values.push(JSON.stringify(body.operatingHours || body.operating_hours));
    }

    if (body.isActive !== undefined || body.is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(Boolean(body.isActive ?? body.is_active));
    }

    if (auth.user.role === UserRole.ADMIN && (body.isApproved !== undefined || body.is_approved !== undefined)) {
      updates.push(`is_approved = $${idx++}`);
      values.push(Boolean(body.isApproved ?? body.is_approved));
    }

    if (updates.length === 0) {
      return apiError("BAD_REQUEST", "No update fields provided", 400);
    }

    values.push(id);
    const updateRes = await pool.query(
      `UPDATE public.merchants
       SET ${updates.join(", ")}
       WHERE id = $${idx}
       RETURNING 
         id, 
         name, 
         category, 
         address, 
         locality, 
         logo_url AS "logoUrl", 
         cover_url AS "coverUrl", 
         gallery_urls AS "galleryUrls", 
         contact_phone AS "contactPhone", 
         operating_hours AS "operatingHours",
         rating,
         rating_count AS "ratingCount",
         is_active AS "isActive",
         is_approved AS "isApproved"`,
      values
    );

    return apiSuccess({ merchant: updateRes.rows[0] });
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to update merchant profile", 500);
  }
}
