// Haversine formula — mirrors src/utils/calculateDistance.js on the
// frontend exactly, so distance/ETA numbers match whether computed
// client-side (mock mode) or server-side (real mode).
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (
    lat1 == null || lon1 == null || lat2 == null || lon2 == null
  ) {
    return null;
  }

  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth's radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
}

export function estimateETA(distanceKm) {
  if (distanceKm == null) return null;
  const minutes = Math.round((distanceKm / 30) * 60);
  return Math.max(minutes, 3);
}
