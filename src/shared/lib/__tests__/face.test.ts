import { measureFace, measurementFields } from '../face';

/** An oval-ish contour: 36 points around (0,0), 100 wide and 140 tall. */
const oval = Array.from({ length: 36 }, (_, i) => {
  const a = (i / 36) * 2 * Math.PI;
  return { x: 50 * Math.cos(a), y: 70 * Math.sin(a) };
});

describe('measureFace', () => {
  it('turns the face contour into 4 proportional measurements', () => {
    const m = measureFace(oval)!;
    expect(m.faceLength).toBe(140);
    // Widest around the cheekbones, narrower at the forehead and the jaw.
    expect(m.cheekboneWidth).toBeGreaterThan(m.foreheadWidth);
    expect(m.cheekboneWidth).toBeGreaterThan(m.jawWidth);
  });

  it('gives nothing for a contour that is not a face', () => {
    expect(measureFace([{ x: 0, y: 0 }])).toBeNull();
    expect(measureFace(Array.from({ length: 10 }, () => ({ x: 1, y: 1 })))).toBeNull();
  });

  it('sends only the 4 numbers with an upload', () => {
    expect(
      measurementFields({ faceLength: 140, foreheadWidth: 90, cheekboneWidth: 100, jawWidth: 80 }),
    ).toEqual({
      faceLength: '140',
      foreheadWidth: '90',
      cheekboneWidth: '100',
      jawWidth: '80',
    });
    expect(measurementFields(null)).toEqual({});
  });
});
