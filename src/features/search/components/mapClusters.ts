export interface Point {
  id: string;
  latitude: number;
  longitude: number;
}

export interface Cluster<T extends Point> {
  id: string;
  latitude: number;
  longitude: number;
  members: T[];
}

const TILE = 256;

/** Web Mercator pixel position at a zoom: the same projection the map draws with. */
function toPixels(p: Point, zoom: number): { x: number; y: number } {
  const scale = TILE * 2 ** zoom;
  const sin = Math.sin((p.latitude * Math.PI) / 180);
  const clamped = Math.min(Math.max(sin, -0.9999), 0.9999);
  return {
    x: ((p.longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) * scale,
  };
}

/**
 * Groups points that would overlap on screen at this zoom (closer than `radius` pixels), so pins
 * never pile on each other. A group of one is a plain pin. Greedy and in order: enough for the
 * few dozen results of a page.
 */
export function clusterPoints<T extends Point>(points: T[], zoom: number, radius: number): Cluster<T>[] {
  const groups: { x: number; y: number; members: T[] }[] = [];
  for (const point of points) {
    const { x, y } = toPixels(point, zoom);
    const near = groups.find((g) => Math.hypot(g.x - x, g.y - y) < radius);
    if (near) {
      near.members.push(point);
    } else {
      groups.push({ x, y, members: [point] });
    }
  }
  return groups.map((g) => {
    const n = g.members.length;
    return {
      id: n === 1 ? g.members[0]!.id : `cluster-${g.members.map((m) => m.id).join('-')}`,
      latitude: g.members.reduce((sum, m) => sum + m.latitude, 0) / n,
      longitude: g.members.reduce((sum, m) => sum + m.longitude, 0) / n,
      members: g.members,
    };
  });
}
