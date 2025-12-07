// src/modules/positions/positions.utils.js

export const toISO = (date) => {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString();
};

// convert m/s -> km/h (if needed) or keep as-is if already km/h
export const mpsToKmph = (v) => {
  if (v == null) return null;
  return v * 3.6;
};

// Haversine distance in meters
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// build geometry WKT (Point) for PostGIS if you choose to use raw SQL
export function buildPointWKT(longitude, latitude) {
  return `POINT(${longitude} ${latitude})`;
}
