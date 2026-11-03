/**
 * Calculate Haversine distance between two coordinates in kilometers.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 100) / 100;
}

/**
 * Estimate travel duration in minutes based on urban Tier-2 speed (20 km/h average) + fixed buffer.
 */
export function estimateTravelDurationMin(distanceKm: number): number {
  const averageSpeedKmH = 20;
  const stopBufferMin = 5;
  const durationMin = (distanceKm / averageSpeedKmH) * 60 + stopBufferMin;
  return Math.ceil(durationMin);
}

/**
 * Demo policy fee calculator.
 * Strictly labeled DEMO POLICY until commercial sign-off.
 */
export function calculateDemoDeliveryFee(
  baseDistanceKm: number,
  itemCount: number
): { amount: number; ruleCode: string; isDemoRule: true } {
  const baseRate = 20.0; // INR
  const perKmRate = 8.0; // INR
  const extraItemFee = itemCount > 3 ? (itemCount - 3) * 5.0 : 0.0;
  const totalFee = baseRate + baseDistanceKm * perKmRate + extraItemFee;

  return {
    amount: Math.round(totalFee * 100) / 100,
    ruleCode: "DEMO_KHAMMAM_SHARED_V1",
    isDemoRule: true,
  };
}

