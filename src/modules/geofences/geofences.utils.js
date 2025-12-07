// src/modules/geofences/geofences.utils.js

export function toRad(v) { return (v * Math.PI) / 180; }

// Haversine distance in meters
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const dφ = toRad(lat2 - lat1), dλ = toRad(lon2 - lon1);
  const a = Math.sin(dφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function pointInCircle(pointLat, pointLon, centerLat, centerLon, radiusMeters) {
  return haversineDistance(pointLat, pointLon, centerLat, centerLon) <= radiusMeters;
}

// Ray-casting algorithm (polygon is array [[lat, lon], ...])
// Use lon as x, lat as y for planar ray casting. Handles simple polygons.
export function pointInPolygon(pointLat, pointLon, polygon) {
  let inside = false;
  const x = pointLon; // longitude = x axis
  const y = pointLat; // latitude = y axis
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i][0], xi = polygon[i][1];
    const yj = polygon[j][0], xj = polygon[j][1];
    // Convert to x/lon and y/lat
    const polyXi = xi, polyYi = yi;
    const polyXj = xj, polyYj = yj;
    const intersect = ((polyYi > y) !== (polyYj > y)) &&
      (x < (polyXj - polyXi) * (y - polyYi) / (polyYj - polyYi + Number.EPSILON) + polyXi);
    if (intersect) inside = !inside;
  }
  return inside;
}
