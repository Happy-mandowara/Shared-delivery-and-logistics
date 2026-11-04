import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ServiceZoneEligibilityQuerySchema } from "@nationx/shared";
import { calculateHaversineDistanceKm } from "@nationx/shared";

/**
 * GET /api/v1/zones
 * List all active service zones and their operating parameters.
 * Optional query: ?latitude=...&longitude=... to check location eligibility.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latParam = searchParams.get("latitude");
    const lngParam = searchParams.get("longitude");

    // 1. If coordinates provided, check location eligibility
    if (latParam && lngParam) {
      const parsed = ServiceZoneEligibilityQuerySchema.safeParse({
        latitude: latParam,
        longitude: lngParam,
      });

      if (!parsed.success) {
        return apiError("INVALID_COORDINATES", "Invalid latitude or longitude provided", 400);
      }

      const { latitude, longitude } = parsed.data;

      // Fetch active zones
      const zonesRes = await pool.query(
        `SELECT * FROM public.service_zones WHERE is_active = true`
      );

      let matchedZone: any = null;
      let minDistance = Infinity;

      for (const zone of zonesRes.rows) {
        const dist = calculateHaversineDistanceKm(
          latitude,
          longitude,
          zone.center_latitude,
          zone.center_longitude
        );

        if (dist <= zone.radius_km && dist < minDistance) {
          minDistance = dist;
          matchedZone = zone;
        }
      }

      if (!matchedZone) {
        return apiSuccess({
          isEligible: false,
          message: "Delivery is currently not available at this location. Expanding soon across Telangana.",
          zone: null,
        });
      }

      // Check operating hours
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0") + ":00";
      const isWithinHours = currentHours >= matchedZone.operating_hours_start && currentHours <= matchedZone.operating_hours_end;

      return apiSuccess({
        isEligible: true,
        isWithinOperatingHours: isWithinHours,
        distanceToCenterKm: Math.round(minDistance * 10) / 10,
        zone: {
          id: matchedZone.id,
          code: matchedZone.code,
          name: matchedZone.name,
          city: matchedZone.city,
          state: matchedZone.state,
          centerLatitude: Number(matchedZone.center_latitude),
          centerLongitude: Number(matchedZone.center_longitude),
          radiusKm: Number(matchedZone.radius_km),
          operatingHoursStart: matchedZone.operating_hours_start,
          operatingHoursEnd: matchedZone.operating_hours_end,
          baseDeliveryFee: Number(matchedZone.base_delivery_fee),
          perKmFee: Number(matchedZone.per_km_fee),
          maxBatchOrders: matchedZone.max_batch_orders,
          maxBatchCapacity: matchedZone.max_batch_capacity,
        },
      });
    }

    // 2. Otherwise return all active service zones with localities
    const zonesRes = await pool.query(
      `SELECT * FROM public.service_zones WHERE is_active = true ORDER BY city ASC, name ASC`
    );

    const localitiesRes = await pool.query(
      `SELECT * FROM public.service_localities WHERE is_active = true ORDER BY name ASC`
    );

    const localitiesByZone = new Map<string, any[]>();
    for (const loc of localitiesRes.rows) {
      const list = localitiesByZone.get(loc.zone_id) || [];
      list.push({
        id: loc.id,
        zoneId: loc.zone_id,
        name: loc.name,
        code: loc.code,
        latitude: loc.latitude,
        longitude: loc.longitude,
        isActive: loc.is_active,
      });
      localitiesByZone.set(loc.zone_id, list);
    }

    const zones = zonesRes.rows.map((z) => ({
      id: z.id,
      code: z.code,
      name: z.name,
      city: z.city,
      state: z.state,
      centerLatitude: z.center_latitude,
      centerLongitude: z.center_longitude,
      radiusKm: z.radius_km,
      operatingHoursStart: z.operating_hours_start,
      operatingHoursEnd: z.operating_hours_end,
      isActive: z.is_active,
      maxBatchOrders: z.max_batch_orders,
      maxBatchCapacity: z.max_batch_capacity,
      baseDeliveryFee: Number(z.base_delivery_fee),
      perKmFee: Number(z.per_km_fee),
      minOrderSubtotal: Number(z.min_order_subtotal),
      localities: localitiesByZone.get(z.id) || [],
    }));

    return apiSuccess({ zones });
  } catch (err: any) {
    return apiError("SERVER_ERROR", err.message || "Failed to fetch service zones", 500);
  }
}

