import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId");
    const batchId = searchParams.get("batchId");

    let query = `
      SELECT 
        dp.id,
        dp.user_id AS "userId",
        u.name AS "partnerName",
        dp.vehicle_type AS "vehicleType",
        dp.availability,
        dp.current_locality AS "currentLocality",
        dp.latitude,
        dp.longitude,
        dp.updated_at AS "updatedAt"
      FROM public.delivery_partners dp
      JOIN public.users u ON u.id = dp.user_id
    `;

    const params: any[] = [];

    if (partnerId) {
      query += ` WHERE dp.id = $1`;
      params.push(partnerId);
    } else if (batchId) {
      query += ` 
        JOIN public.delivery_assignments da ON da.partner_id = dp.id
        WHERE da.batch_id = $1
      `;
      params.push(batchId);
    } else {
      // Return all active partners for Admin
      query += ` WHERE dp.availability != 'OFFLINE'`;
    }

    const { rows } = await pool.query(query, params);
    if (rows.length === 0) {
      // Fallback default coordinates in Khammam
      return apiSuccess({
        location: {
          latitude: 17.2472,
          longitude: 80.1514,
          locality: "Wyra Road, Khammam",
          updatedAt: new Date().toISOString(),
        }
      });
    }

    return apiSuccess({
      location: {
        partnerId: rows[0].id,
        partnerName: rows[0].partnerName,
        latitude: rows[0].latitude || 17.2472,
        longitude: rows[0].longitude || 80.1514,
        locality: rows[0].currentLocality || "Wyra Road, Khammam",
        updatedAt: rows[0].updatedAt,
      },
      partners: rows,
    });
  } catch (err: any) {
    return apiError(err.message, "FETCH_LOCATION_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return apiError("Authentication required", "UNAUTHENTICATED", 401);
    }

    const body = await req.json();
    const { latitude, longitude, locality } = body;

    if (!latitude || !longitude) {
      return apiError("latitude and longitude are required", "MISSING_COORDINATES", 400);
    }

    const updateRes = await pool.query(
      `UPDATE public.delivery_partners
       SET latitude = $1,
           longitude = $2,
           current_locality = COALESCE($3, current_locality),
           updated_at = NOW()
       WHERE user_id = $4
       RETURNING id, latitude, longitude, current_locality AS "currentLocality", updated_at AS "updatedAt"`,
      [parseFloat(latitude), parseFloat(longitude), locality || null, user.id]
    );

    if (updateRes.rows.length === 0) {
      return apiError("Delivery partner profile not found for user", "NOT_FOUND", 404);
    }

    return apiSuccess({
      updated: true,
      partner: updateRes.rows[0],
      message: "GPS telemetry updated.",
    });
  } catch (err: any) {
    return apiError(err.message, "UPDATE_LOCATION_ERROR", 500);
  }
}

