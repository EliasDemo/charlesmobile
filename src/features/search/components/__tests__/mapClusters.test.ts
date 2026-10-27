import { clusterPoints } from '../mapClusters';

// Two barbershops ~110 m apart in Miraflores and one in San Isidro (~3 km away).
const a = { id: 'a', latitude: -12.1211, longitude: -77.0297 };
const b = { id: 'b', latitude: -12.1221, longitude: -77.0297 };
const c = { id: 'c', latitude: -12.0972, longitude: -77.0365 };

describe('clusterPoints', () => {
  it('groups pins that would overlap when zoomed out', () => {
    const groups = clusterPoints([a, b, c], 12, 48);
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.members.length === 2)?.members.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('separates them again when zoomed in', () => {
    expect(clusterPoints([a, b, c], 18, 48)).toHaveLength(3);
  });

  it('keeps a lone pin with its own id, and centers a group between its members', () => {
    const groups = clusterPoints([a, b], 10, 48);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.latitude).toBeCloseTo(-12.1216, 4);
    expect(clusterPoints([c], 10, 48)[0]!.id).toBe('c');
  });

  it('handles no points', () => {
    expect(clusterPoints([], 12, 48)).toEqual([]);
  });
});
