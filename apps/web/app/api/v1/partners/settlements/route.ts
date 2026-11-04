import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { authenticateRequest } from "@/lib/auth";

/**
 * GET /api/v1/partners/settlements
 * Authenticated delivery partner fetches their settlement records and cumulative earnings.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return apiError(auth.error || "UNAUTHORIZED", "Authentication required", auth.status);
    }

    if (auth.user.role !== "PARTNER" && auth.user.role !== "ADMIN") {
      return apiError("FORBIDDEN", "Only delivery partners or dispatch ops can view earnings", 403);
    }

    // Resolve partner ID
    let partnerId: string | null = null;
    if (auth.user.role === "PARTNER") {
      const pRes = await pool.query(
        `SELECT id FROM public.delivery_partners WHERE user_id = $1`,
        [auth.user.id]
      );
      if (pRes.rowCount === 0) {
        return apiError("PARTNER_NOT_FOUND", "Partner profile not found", 404);
      }
      partnerId = pRes.rows[0].id;
    } else {
      // Admin optional query parameter
      const { searchParams } = new URL(req.url);
      partnerId = searchParams.get("partnerId");
    }

    let query = `
      SELECT 
        ps.*,
        db.batch_code,
        db.locality AS batch_locality
      FROM public.partner_settlements ps
      JOIN public.delivery_batches db ON ps.batch_id = db.id
    `;
    const params: any[] = [];

    if (partnerId) {
      query += ` WHERE ps.partner_id = $1`;
      params.push(partnerId);
    }

    query += ` ORDER BY ps.created_at DESC`;

    const res = await pool.query(query, params);

    const settlements = res.rows.map((r) => ({
      id: r.id,
      partnerId: r.partner_id,
      batchId: r.batch_id,
      batchCode: r.batch_code,
      batchLocality: r.batch_locality,
      basePayout: Number(r.base_payout),
      stopAllowance: Number(r.stop_allowance),
      distancePayout: Number(r.distance_payout),
      totalPayout: Number(r.total_payout),
      stopsCompleted: r.stops_completed,
      status: r.status,
      settlementNotes: r.settlement_notes,
      disbursedAt: r.disbursed_at,
      createdAt: r.created_at,
    }));

    const totalEarned = settlements
      .filter((s) => s.status === "APPROVED" || s.status === "DISBURSED")
      .reduce((sum, s) => sum + s.totalPayout, 0);

    const pendingPayout = settlements
      .filter((s) => s.status === "PENDING")
      .reduce((sum, s) => sum + s.totalPayout, 0);

    return apiSuccess({
      settlements,
      summary: {
        totalEarned: Math.round(totalEarned * 100) / 100,
        pendingPayout: Math.round(pendingPayout * 100) / 100,
        completedBatchesCount: settlements.length,
      },
    });
  } catch (err: any) {
    return apiError("SERVER_ERROR", err.message || "Failed to fetch settlements", 500);
  }
}

