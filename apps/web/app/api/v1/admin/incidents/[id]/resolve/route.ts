import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== "ADMIN") {
      return apiError("Admin access required", "UNAUTHORIZED", 403);
    }

    const { id } = await params;
    const body = await req.json();
    const { action = "RESOLVED", resolutionNotes } = body;

    const updateRes = await pool.query(
      `UPDATE public.incident_reports
       SET status = 'RESOLVED',
           resolution_notes = $1,
           resolved_by = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, category, status, resolution_notes AS "resolutionNotes"`,
      [resolutionNotes || `Resolved with action: ${action}`, user.id, id]
    );

    if (updateRes.rows.length === 0) {
      return apiError("Incident report not found", "NOT_FOUND", 404);
    }

    return apiSuccess({
      resolved: true,
      incident: updateRes.rows[0],
      message: `Incident resolved successfully via ${action}.`,
    });
  } catch (err: any) {
    return apiError(err.message, "RESOLVE_INCIDENT_ERROR", 500);
  }
}
