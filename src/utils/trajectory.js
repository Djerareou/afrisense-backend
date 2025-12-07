// Simple trajectory utilities: Ramer-Douglas-Peucker simplification
// and a tiny polyline encoder (Google encoded polyline algorithm simplified)

export function rdpSimplify(points, epsilon) {
  // points: [{lat, lng}] or [{latitude, longitude}]
  if (!points || points.length < 3) return points;

  const getX = p => ('lon' in p ? p.lon : ('longitude' in p ? p.longitude : p.lng));
  const getY = p => ('lat' in p ? p.lat : ('latitude' in p ? p.latitude : p.lat));

  function perpendicularDistance(pt, lineStart, lineEnd) {
    const x0 = getX(pt), y0 = getY(pt);
    const x1 = getX(lineStart), y1 = getY(lineStart);
    const x2 = getX(lineEnd), y2 = getY(lineEnd);
    const num = Math.abs((y2 - y1)*x0 - (x2 - x1)*y0 + x2*y1 - y2*x1);
    const den = Math.hypot(y2 - y1, x2 - x1);
    return den === 0 ? Math.hypot(x0 - x1, y0 - y1) : num / den;
  }

  function rdp(points, eps) {
    if (points.length < 3) return points;
    let dmax = 0;
    let index = 0;
    const end = points.length - 1;
    for (let i = 1; i < end; i++) {
      const d = perpendicularDistance(points[i], points[0], points[end]);
      if (d > dmax) {
        index = i;
        dmax = d;
      }
    }
    if (dmax > eps) {
      const rec1 = rdp(points.slice(0, index + 1), eps);
      const rec2 = rdp(points.slice(index), eps);
      return rec1.slice(0, -1).concat(rec2);
    } else {
      return [points[0], points[end]];
    }
  }

  return rdp(points, epsilon);
}

// Minimal polyline encoder for lat/lng array [{latitude,longitude},...]
export function encodePolyline(points) {
  let lastLat = 0;
  let lastLng = 0;
  let result = '';

  function encode(value) {
    let v = Math.round(value) << 1;
    if (value < 0) v = ~v;
    let out = '';
    while (v >= 0x20) {
      out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    out += String.fromCharCode(v + 63);
    return out;
  }

  for (const p of points) {
    const lat = Math.round((p.latitude) * 1e5);
    const lng = Math.round((p.longitude) * 1e5);
    result += encode(lat - lastLat);
    result += encode(lng - lastLng);
    lastLat = lat;
    lastLng = lng;
  }
  return result;
}
