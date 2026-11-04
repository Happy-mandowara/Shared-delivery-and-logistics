import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { authenticateRequest } from "@/lib/auth";
import { z } from "zod";

const CalculateSettlementSchema = z.object({
  batchId: z.string().uuid(),
});

/**
 * GET /api/v1/admin/settlements
 * Admin overview of all partner settlements.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.user || auth.user.role !== "ADMIN") {
      return apiError("FORBIDDEN", "Admin operations authorization required", 403);
    }

    const res = await pool.query(`
      SELECT 
        ps.*,
        u.name AS partner_name,
        u.phone AS partner_phone,
        db.batch_code,
        db.locality AS batch_locality
      FROM public.partner_settlements ps
      JOIN public.delivery_partners dp ON ps.partner_id = dp.id
      JOIN public.users u ON dp.user_id = u.id
      JOIN public.delivery_batches db ON ps.batch_id = db.id
      ORDER BY ps.created_at DESC
    `);

    const settlements = res.rows.map((r) => ({
      id: r.id,
      partnerId: r.partner_id,
      partnerName: r.partner_name,
      partnerPhone: r.partner_phone,
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

    return apiSuccess({ settlements });
  } catch (err: any) {
    return apiError("SERVER_ERROR", err.message || "Failed to fetch admin settlements", 500);
  }
}

/**
 * POST /api/v1/admin/settlements/calculate
 * Calculate partner settlement for a batch.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.user || auth.user.role !== "ADMIN") {
      return apiError("FORBIDDEN", "Admin operations authorization required", 403);
    }

    const body = await req.json().catch(() => null);
    const parsed = CalculateSettlementSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid calculate settlement payload", 400, parsed.error.format());
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SET LOCAL "request.jwt.claim.sub" = $1`, [auth.user.id]);
      await client.query(`SET LOCAL "request.jwt.claim.role" = 'ADMIN'`);

      const res = await client.query(
        `SELECT public.fn_calculate_partner_settlement($1) AS result`,
        [parsed.data.batchId]
      );

      await client.query("COMMIT");
      return apiSuccess({ settlement: res.rows[0].result });
    } catch (dbErr: any) {
      await client.query("ROLLBACK");
      return apiError("SETTLEMENT_FAILED", dbErr.message || "Failed to calculate settlement", 400);
    } finally {
      client.release();
    }
  } catch (err: any) {
    return apiError("SERVER_ERROR", err.message || "Unexpected settlement error", 500);
  }
}

