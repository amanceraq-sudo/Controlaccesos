/**
 * Ray casting: ¿punto [lng, lat] dentro de un anillo GeoJSON?
 */
export function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

export function pointInPolygon(lng, lat, geometry) {
  if (!geometry || geometry.type !== 'Polygon' || !geometry.coordinates?.length) {
    return false;
  }

  const [outer, ...holes] = geometry.coordinates;
  if (!pointInRing([lng, lat], outer)) return false;
  for (const hole of holes) {
    if (pointInRing([lng, lat], hole)) return false;
  }
  return true;
}

export function closeRing(ring) {
  if (!ring?.length) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, [...first]];
}
