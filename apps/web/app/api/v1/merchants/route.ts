import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { UserRole } from "@nationx/shared";
import { z } from "zod";

const createMerchantSchema = z.object({
  name: z.string().min(2, "Shop name must be at least 2 characters"),
  category: z.string().min(2, "Category is required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  locality: z.string().min(2, "Locality is required"),
  latitude: z.number().optional().default(17.2473),
  longitude: z.number().optional().default(80.1514),
  contactPhone: z.string().optional(),
  logoUrl: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
  operatingHours: z.record(z.any()).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locality = searchParams.get("locality");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const status = searchParams.get("status"); // 'all' | 'pending' | 'approved'
  const includeUnapproved = searchParams.get("includeUnapproved") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  try {
    // Check if requester is admin
    const auth = await authenticateRequest(req);
    const isAdmin = auth.user?.role === UserRole.ADMIN;

    let whereClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by approval status
    if (isAdmin && (status === "all" || includeUnapproved)) {
      if (status === "pending") {
        whereClauses.push(`(m.is_approved = false OR m.is_approved IS NULL)`);
      } else if (status === "approved") {
        whereClauses.push(`m.is_approved = true AND m.is_active = true`);
      }
    } else if (status === "pending" && isAdmin) {
      whereClauses.push(`(m.is_approved = false OR m.is_approved IS NULL)`);
    } else {
      // Public / customer view: ONLY approved and active merchants
      whereClauses.push(`m.is_active = true AND (m.is_approved IS TRUE OR m.is_approved IS NULL)`);
    }

    if (locality && locality !== "All") {
      whereClauses.push(`LOWER(m.locality) = LOWER($${paramIndex++})`);
      params.push(locality);
    }

    if (category && category !== "All") {
      whereClauses.push(`LOWER(m.category) = LOWER($${paramIndex++})`);
      params.push(category);
    }

    if (search) {
      whereClauses.push(`(m.name ILIKE $${paramIndex} OR m.locality ILIKE $${paramIndex} OR m.category ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Count total matching
    const countRes = await pool.query(`SELECT count(*)::int as total FROM public.merchants m ${whereSql}`, params);
    const total = countRes.rows[0]?.total || 0;

    let query = `
      SELECT 
        m.id,
        m.user_id AS "userId",
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
        m.created_at AS "createdAt",
        (
          SELECT count(*)::int 
          FROM public.products p 
          WHERE p.merchant_id = m.id AND p.is_active = true AND (p.is_archived IS FALSE OR p.is_archived IS NULL)
        ) AS "productCount"
      FROM public.merchants m
      ${whereSql}
      ORDER BY m.created_at DESC, m.name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);

    const res = await pool.query(query, params);

    return apiSuccess({
      merchants: res.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + res.rows.length < total,
      },
    });
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch merchants", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.MERCHANT]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = createMerchantSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid merchant details", 400);
    }

    const data = parsed.data;
    const userId = auth.user.role === UserRole.MERCHANT ? auth.user.id : (body.userId || auth.user.id);
    const isApproved = auth.user.role === UserRole.ADMIN; // Auto-approved if created by admin
    const isActive = true;

    // Generate shop code from name
    const cleanName = data.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "SHOP";
    const randSuffix = Math.floor(100 + Math.random() * 900);
    const code = `${cleanName}-${randSuffix}`;

    const insertRes = await pool.query(
      `INSERT INTO public.merchants (
        user_id, name, code, category, address, locality, latitude, longitude,
        contact_phone, logo_url, cover_url, operating_hours, is_active, is_approved
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING 
        id, user_id AS "userId", name, code, category, address, locality,
        latitude, longitude, contact_phone AS "contactPhone", logo_url AS "logoUrl",
        cover_url AS "coverUrl", is_active AS "isActive", is_approved AS "isApproved"`,
      [
        userId,
        data.name,
        code,
        data.category,
        data.address,
        data.locality,
        data.latitude,
        data.longitude,
        data.contactPhone || null,
        data.logoUrl || null,
        data.coverUrl || null,
        JSON.stringify(data.operatingHours || { open: "09:00", close: "22:00" }),
        isActive,
        isApproved,
      ]
    );

    const newMerchant = insertRes.rows[0];

    // Log administrative / operational event
    await pool.query(
      `INSERT INTO public.delivery_events (
        event_type, actor_id, actor_role, metadata, note
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        "MERCHANT_CREATED",
        auth.user.id,
        auth.user.role,
        JSON.stringify({ merchantId: newMerchant.id, name: newMerchant.name, code: newMerchant.code }),
        `Merchant outlet created: ${newMerchant.name} (${newMerchant.locality})`
      ]
    );

    return apiSuccess({
      merchant: newMerchant,
      message: isApproved ? "Shop created and activated successfully." : "Shop submitted for administrative review.",
    }, 201);
  } catch (err: any) {
    return apiError("CREATION_FAILED", err.message || "Failed to create merchant", 500);
  }
}
