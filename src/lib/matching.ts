import type { Coordinate } from './mockData';

// Haversine formula to calculate distance between two coordinates in km
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  return R * c;
}

// Helper to calculate total distance of a route sequence
export function calculateRouteDistance(points: Coordinate[]): number {
  let distance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    distance += getDistance(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng);
  }
  return distance;
}

export interface MatchResult {
  isMatch: boolean;
  detourDistance: number;
  newRoute: Coordinate[];
  score: number; // 0 to 100
  insertIndexPickup: number;
  insertIndexDropoff: number;
}

/**
 * Finds the optimal way to insert a pickup (P) and dropoff (D) into a driver's route
 * W1 -> W2 -> ... -> Wn.
 * Returns the best insertion sequence with the minimum detour distance.
 */
export function findBestDetour(
  driverWaypoints: Coordinate[],
  pickup: Coordinate,
  dropoff: Coordinate,
  maxDetourKm: number = 3.0
): MatchResult {
  if (driverWaypoints.length < 2) {
    // If driver has less than 2 waypoints, just calculate direct route P -> D
    const directDist = getDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    const newRoute = [...driverWaypoints, pickup, dropoff];
    return {
      isMatch: true,
      detourDistance: directDist,
      newRoute,
      score: 100,
      insertIndexPickup: driverWaypoints.length,
      insertIndexDropoff: driverWaypoints.length + 1,
    };
  }

  const originalDistance = calculateRouteDistance(driverWaypoints);
  let minDetour = Infinity;
  let bestRoute: Coordinate[] = [];
  let bestPickupIdx = -1;
  let bestDropoffIdx = -1;

  const n = driverWaypoints.length;

  // We want to insert P at index i (0 to n)
  // We want to insert D at index j (i to n)
  for (let i = 0; i <= n; i++) {
    for (let j = i; j <= n; j++) {
      const tempRoute = [...driverWaypoints];
      
      // Insert pickup at i
      tempRoute.splice(i, 0, pickup);
      
      // Insert dropoff at j + 1 (since we inserted pickup, the relative index shifts by 1)
      tempRoute.splice(j + 1, 0, dropoff);

      const tempDistance = calculateRouteDistance(tempRoute);
      const detour = tempDistance - originalDistance;

      if (detour < minDetour) {
        minDetour = detour;
        bestRoute = tempRoute;
        bestPickupIdx = i;
        bestDropoffIdx = j + 1;
      }
    }
  }

  // Ensure detour isn't negative due to floating point inaccuracies
  const finalDetour = Math.max(0, minDetour);
  const isMatch = finalDetour <= maxDetourKm;
  
  // Calculate match score: 100% for 0km detour, scales down to 0% at maxDetourKm
  const score = isMatch
    ? Math.max(10, Math.min(100, Math.round((1 - finalDetour / maxDetourKm) * 90) + 10))
    : 0;

  return {
    isMatch,
    detourDistance: parseFloat(finalDetour.toFixed(2)),
    newRoute: bestRoute,
    score,
    insertIndexPickup: bestPickupIdx,
    insertIndexDropoff: bestDropoffIdx,
  };
}
