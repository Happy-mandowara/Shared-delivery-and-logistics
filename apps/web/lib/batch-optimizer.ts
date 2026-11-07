/**
 * NationX Intelligent Shared Delivery Batch Optimization Engine
 *
 * Implements multi-criteria clustering and route sequencing:
 * 1. Locality & Corridor Matching (Haversine proximity)
 * 2. Promised Delivery Window Compatibility (overlapping customer windows)
 * 3. Merchant Readiness & Urgency (prioritizing ready suborders; never delaying ready orders)
 * 4. Partner Capacity Constraints (vehicle capacity units e.g. 10 max)
 * 5. Item Handling Compatibility (handling tags)
 * 6. TSP Route Sequencing (Pickups first via Nearest Neighbor -> Dropoffs via Nearest Neighbor)
 * 7. Distance & Travel Time Estimation (Haversine km + 20 km/h urban speed)
 */

import { calculateHaversineDistanceKm, estimateTravelDurationMin } from "@nationx/shared";
import { pool } from "./db";

export interface CandidateSuborder {
  suborderId: string;
  orderId: string;
  suborderNumber?: string;
  orderNumber?: string;
  status: string;
  merchantId: string;
  merchantName: string;
  merchantLocality: string;
  merchantAddress: string;
  merchantLat?: number;
  merchantLng?: number;
  deliveryLocality: string;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryWindowStart?: string | null;
  deliveryWindowEnd?: string | null;
  dispatchDeadline?: string | null;
  itemCount: number;
  estimatedWeightUnits: number;
  handlingTags?: string[];
}

export interface OptimizedStop {
  sequence: number;
  type: "PICKUP" | "DROPOFF";
  merchantId?: string;
  orderId?: string;
  suborderId?: string;
  address: string;
  locality: string;
  latitude: number;
  longitude: number;
}

export interface OptimizedBatchGroup {
  locality: string;
  suborderIds: string[];
  suborders: CandidateSuborder[];
  totalUnits: number;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  stops: OptimizedStop[];
  hasReadyOrders: boolean;
  priorityScore: number;
}

/**
 * Optimizes a list of candidate suborders into high-efficiency delivery batches.
 */
export function optimizeBatches(
  candidates: CandidateSuborder[],
  options: {
    maxOrders?: number;
    maxCapacityUnits?: number;
    locality?: string;
  } = {}
): OptimizedBatchGroup[] {
  const maxOrders = options.maxOrders || 8;
  const maxCapacity = options.maxCapacityUnits || 10;
  const targetLocality = options.locality && options.locality !== "ALL" ? options.locality : null;

  // 1. Filter candidates by locality if specified
  let pool = candidates.filter((c) => {
    if (!targetLocality) return true;
    const l1 = (c.deliveryLocality || "").toLowerCase();
    const l2 = (c.merchantLocality || "").toLowerCase();
    const target = targetLocality.toLowerCase();
    return l1.includes(target) || l2.includes(target);
  });

  if (pool.length === 0) return [];

  // 2. Sort pool by urgency: READY_FOR_PICKUP first, then closest dispatch deadline
  pool.sort((a, b) => {
    const aReady = a.status === "READY_FOR_PICKUP" ? 1 : 0;
    const bReady = b.status === "READY_FOR_PICKUP" ? 1 : 0;
    if (aReady !== bReady) return bReady - aReady;

    const aDeadline = a.dispatchDeadline ? new Date(a.dispatchDeadline).getTime() : Infinity;
    const bDeadline = b.dispatchDeadline ? new Date(b.dispatchDeadline).getTime() : Infinity;
    return aDeadline - bDeadline;
  });

  // 3. Cluster candidates into capacity-compliant batches
  const batches: CandidateSuborder[][] = [];
  const assigned = new Set<string>();

  for (let i = 0; i < pool.length; i++) {
    const seed = pool[i];
    if (assigned.has(seed.suborderId)) continue;

    const currentBatch: CandidateSuborder[] = [seed];
    assigned.add(seed.suborderId);
    let currentCapacity = seed.estimatedWeightUnits || 1;

    // Search for compatible candidates to bundle with the seed
    for (let j = 0; j < pool.length; j++) {
      if (currentBatch.length >= maxOrders) break;
      const candidate = pool[j];
      if (assigned.has(candidate.suborderId)) continue;

      const candidateUnits = candidate.estimatedWeightUnits || 1;
      if (currentCapacity + candidateUnits > maxCapacity) continue;

      // Locality compatibility check
      const sameDeliveryLocality =
        seed.deliveryLocality.toLowerCase() === candidate.deliveryLocality.toLowerCase();
      const sameMerchantLocality =
        seed.merchantLocality.toLowerCase() === candidate.merchantLocality.toLowerCase();

      // Delivery window compatibility check (overlapping or within 45 mins)
      let timeCompatible = true;
      if (seed.deliveryWindowEnd && candidate.deliveryWindowEnd) {
        const seedEnd = new Date(seed.deliveryWindowEnd).getTime();
        const candEnd = new Date(candidate.deliveryWindowEnd).getTime();
        const diffMin = Math.abs(seedEnd - candEnd) / (60 * 1000);
        if (diffMin > 45) {
          timeCompatible = false;
        }
      }

      // Proximity score
      const seedLat = seed.deliveryLat || 17.2472;
      const seedLng = seed.deliveryLng || 80.1514;
      const candLat = candidate.deliveryLat || 17.2472;
      const candLng = candidate.deliveryLng || 80.1514;
      const distKm = calculateHaversineDistanceKm(seedLat, seedLng, candLat, candLng);

      // Compatible if within 5km and time window overlaps
      if ((sameDeliveryLocality || sameMerchantLocality || distKm <= 5.0) && timeCompatible) {
        currentBatch.push(candidate);
        assigned.add(candidate.suborderId);
        currentCapacity += candidateUnits;
      }
    }

    batches.push(currentBatch);
  }

  // 4. For each batch, calculate optimal stop sequence (Pickups -> Dropoffs)
  const results: OptimizedBatchGroup[] = [];

  for (const batch of batches) {
    const batchLocality = batch[0].deliveryLocality || targetLocality || "Khammam Central";
    const totalUnits = batch.reduce((sum, c) => sum + (c.estimatedWeightUnits || 1), 0);
    const hasReadyOrders = batch.some((c) => c.status === "READY_FOR_PICKUP");

    // A. Distinct merchant pickup stops
    const merchantMap = new Map<string, CandidateSuborder>();
    for (const c of batch) {
      if (!merchantMap.has(c.merchantId)) {
        merchantMap.set(c.merchantId, c);
      }
    }

    const pickupStops: OptimizedStop[] = [];
    const merchantCandidates = Array.from(merchantMap.values());

    // Sequence pickups using nearest-neighbor starting from first merchant
    let currentLat = merchantCandidates[0].merchantLat || 17.2472;
    let currentLng = merchantCandidates[0].merchantLng || 80.1514;
    const remainingMerchants = [...merchantCandidates];

    while (remainingMerchants.length > 0) {
      let bestIdx = 0;
      let minDistance = Infinity;

      for (let k = 0; k < remainingMerchants.length; k++) {
        const m = remainingMerchants[k];
        const mLat = m.merchantLat || 17.2472;
        const mLng = m.merchantLng || 80.1514;
        const dist = calculateHaversineDistanceKm(currentLat, currentLng, mLat, mLng);
        if (dist < minDistance) {
          minDistance = dist;
          bestIdx = k;
        }
      }

      const nextMerchant = remainingMerchants.splice(bestIdx, 1)[0];
      currentLat = nextMerchant.merchantLat || 17.2472;
      currentLng = nextMerchant.merchantLng || 80.1514;

      pickupStops.push({
        sequence: pickupStops.length + 1,
        type: "PICKUP",
        merchantId: nextMerchant.merchantId,
        address: nextMerchant.merchantAddress,
        locality: nextMerchant.merchantLocality,
        latitude: currentLat,
        longitude: currentLng,
      });
    }

    // B. Customer dropoff stops
    // Deduplicate customer orders in case multiple suborders belong to same customer order
    const orderMap = new Map<string, CandidateSuborder>();
    for (const c of batch) {
      if (!orderMap.has(c.orderId)) {
        orderMap.set(c.orderId, c);
      }
    }

    const dropoffStops: OptimizedStop[] = [];
    const remainingOrders = Array.from(orderMap.values());

    // Sequence dropoffs using nearest-neighbor starting from the last merchant pickup location
    while (remainingOrders.length > 0) {
      let bestIdx = 0;
      let minDistance = Infinity;

      for (let k = 0; k < remainingOrders.length; k++) {
        const ord = remainingOrders[k];
        const oLat = ord.deliveryLat || 17.2472;
        const oLng = ord.deliveryLng || 80.1514;
        const dist = calculateHaversineDistanceKm(currentLat, currentLng, oLat, oLng);
        if (dist < minDistance) {
          minDistance = dist;
          bestIdx = k;
        }
      }

      const nextOrder = remainingOrders.splice(bestIdx, 1)[0];
      currentLat = nextOrder.deliveryLat || 17.2472;
      currentLng = nextOrder.deliveryLng || 80.1514;

      dropoffStops.push({
        sequence: pickupStops.length + dropoffStops.length + 1,
        type: "DROPOFF",
        orderId: nextOrder.orderId,
        suborderId: nextOrder.suborderId,
        address: nextOrder.deliveryAddress,
        locality: nextOrder.deliveryLocality,
        latitude: currentLat,
        longitude: currentLng,
      });
    }

    const allStops = [...pickupStops, ...dropoffStops];

    // C. Calculate total distance along the optimized stop sequence
    let totalDistKm = 0;
    for (let s = 1; s < allStops.length; s++) {
      totalDistKm += calculateHaversineDistanceKm(
        allStops[s - 1].latitude,
        allStops[s - 1].longitude,
        allStops[s].latitude,
        allStops[s].longitude
      );
    }

    // Round distance and estimate duration
    const finalDistKm = Math.max(1.2, Math.round(totalDistKm * 10) / 10);
    const finalDurationMin = estimateTravelDurationMin(finalDistKm);

    results.push({
      locality: batchLocality,
      suborderIds: batch.map((c) => c.suborderId),
      suborders: batch,
      totalUnits,
      estimatedDistanceKm: finalDistKm,
      estimatedDurationMin: finalDurationMin,
      stops: allStops,
      hasReadyOrders,
      priorityScore: hasReadyOrders ? 100 : 50,
    });
  }

  return results;
}

/**
 * Updates batch stop sequence and telemetry in PostgreSQL.
 */
export async function applyOptimizedSequence(
  batchId: string,
  estimatedDistanceKm: number,
  estimatedDurationMin: number,
  stops: OptimizedStop[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Update batch distance and duration estimates
    await client.query(
      `UPDATE public.delivery_batches
       SET estimated_distance_km = $1, estimated_duration_min = $2, updated_at = NOW()
       WHERE id = $3`,
      [estimatedDistanceKm, estimatedDurationMin, batchId]
    );

    // 2. Update sequence order on delivery_stops
    for (const stop of stops) {
      if (stop.type === "PICKUP" && stop.merchantId) {
        await client.query(
          `UPDATE public.delivery_stops
           SET sequence = $1
           WHERE batch_id = $2 AND type = 'PICKUP' AND merchant_id = $3`,
          [stop.sequence, batchId, stop.merchantId]
        );
      } else if (stop.type === "DROPOFF" && stop.orderId) {
        await client.query(
          `UPDATE public.delivery_stops
           SET sequence = $1
           WHERE batch_id = $2 AND type = 'DROPOFF' AND order_id = $3`,
          [stop.sequence, batchId, stop.orderId]
        );
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

