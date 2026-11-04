import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return apiError("Authentication required", "UNAUTHENTICATED", 401);
    }

    let query = `
      SELECT 
        i.id,
        i.partner_id AS "partnerId",
        u.name AS "reporterName",
        i.batch_id AS "batchId",
        i.stop_id AS "stopId",
        i.incident_type AS "category",
        i.severity,
        i.description,
        i.evidence_urls AS "photoUrls",
        i.latitude,
        i.longitude,
        i.status,
        i.resolution_notes AS "resolutionNotes",
        i.created_at AS "createdAt"
      FROM public.incident_reports i
      JOIN public.delivery_partners dp ON dp.id = i.partner_id
      JOIN public.users u ON u.id = dp.user_id
    `;

    const params: any[] = [];
    if (user.role !== "ADMIN") {
      query += ` WHERE dp.user_id = $1`;
      params.push(user.id);
    }

    query += ` ORDER BY i.created_at DESC`;

    const { rows } = await pool.query(query, params);
    return apiSuccess({ incidents: rows });
  } catch (err: any) {
    return apiError(err.message, "FETCH_INCIDENTS_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return apiError("Authentication required", "UNAUTHENTICATED", 401);
    }

    const body = await req.json();
    let {
      batchId,
      stopId,
      category = "VEHICLE_BREAKDOWN",
      incidentType,
      severity = "MEDIUM",
      description,
      photoUrls = [],
      evidenceUrls,
      latitude,
      longitude,
    } = body;

    if (!description) {
      return apiError("Incident description is required", "DESCRIPTION_REQUIRED", 400);
    }

    // Map category to allowed incident_type
    const type = incidentType || category;
    const allowedTypes = [
      "CUSTOMER_UNREACHABLE",
      "INCORRECT_ADDRESS",
      "MERCHANT_DELAY",
      "VEHICLE_BREAKDOWN",
      "ACCIDENT_SAFETY",
      "PACKAGE_DAMAGED",
      "CUSTOMER_DISPUTE",
      "EXTREME_WEATHER",
      "OTHER"
    ];
    const finalType = allowedTypes.includes(type) ? type : "OTHER";

    // Lookup partner id for this user
    let pRes = await pool.query(
      `SELECT id FROM public.delivery_partners WHERE user_id = $1`,
      [user.id]
    );

    let partnerId = pRes.rows[0]?.id;
    if (!partnerId) {
      // Fallback: pick any partner if admin or create partner record
      const anyP = await pool.query(`SELECT id FROM public.delivery_partners LIMIT 1`);
      partnerId = anyP.rows[0]?.id;
    }

    const insertRes = await pool.query(
      `INSERT INTO public.incident_reports (
         partner_id, batch_id, stop_id, incident_type, severity, description,
         evidence_urls, latitude, longitude, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'REPORTED')
       RETURNING id, incident_type AS "category", status, created_at AS "createdAt"`,
      [
        partnerId,
        batchId || null,
        stopId || null,
        finalType,
        severity,
        description,
        evidenceUrls || photoUrls,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
      ]
    );

    const incident = insertRes.rows[0];

    return apiSuccess({
      incident,
      message: "Incident report submitted. Operations team has been alerted.",
    });
  } catch (err: any) {
    return apiError(err.message, "REPORT_INCIDENT_ERROR", 500);
  }
}
